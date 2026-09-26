import { Sequelize } from 'sequelize';
import { VendorService } from '@Modules/vendor/vendor.service';
import { StatementImportService } from './statement-import.service';
import { StatementImportRepository } from './statement-import.repository';
import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { IImportTransactionRow } from './interfaces/statement-import.interface';
import { VendorAliasService } from '@Modules/vendor-alias/vendor-alias.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { LeakResponseService } from '@Modules/leak-response/leak-response.service';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';
import { normalizeDescription } from '@Modules/vendor-alias/utilities/description.utility';
import { VendorClassifierService } from '@Modules/vendor-classifier/vendor-classifier.service';
import { RECURRENCE_THRESHOLDS } from '@Modules/transaction/constants/recurrence-detection.constant';
import { CancellationContactService } from '@Modules/cancellation-contact/cancellation-contact.service';

const capturedPipelinePromise: { current: Promise<void> | null } = {
  current: null,
};
const waitUntilMock = jest.fn((promise: Promise<void>) => {
  capturedPipelinePromise.current = promise;
});

jest.mock('@vercel/functions', () => ({
  waitUntil: (promise: Promise<void>) => waitUntilMock(promise),
}));

// Columns: date, description, transaction amount, transaction currency, charged amount, charged
// currency, external id, notes — the same shape the scraper rows are reduced to.
const buildRows = (rawRows: string[][]): IImportTransactionRow[] =>
  rawRows.map(
    ([transactionDate, description, , , amount, currency, externalId]) => ({
      amount,
      currency,
      transactionDate,
      originalDescription: description,
      externalId: externalId || null,
    }),
  );

const buildBankImport = (rows: IImportTransactionRow[]) => ({
  rows,
  rowErrors: [],
  bankConnectionId: 'connection-1',
});

// startBankImport only kicks off the background pipeline via waitUntil; tests await the promise
// captured from the mocked waitUntil to observe the pipeline's side effects.
const flushDeferredPipeline = async (): Promise<void> => {
  await capturedPipelinePromise.current;
};

// Resolves every requested vendor name to the given vendor, as the batched lookup would.
const resolveEveryNameTo = (vendor: unknown) =>
  jest
    .fn()
    .mockImplementation((entries: { name: string }[]) =>
      Promise.resolve(new Map(entries.map((entry) => [entry.name, vendor]))),
    );

const resolveRecurrenceForEveryVendor =
  (recurrence: unknown) =>
  (_userId: string, requests: { vendorId: string }[]) =>
    Promise.resolve(
      new Map(requests.map((request) => [request.vendorId, recurrence])),
    );

describe('StatementImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildTransaction = () => ({
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  });

  const buildSequelize = () =>
    ({
      transaction: jest.fn().mockImplementation(() => buildTransaction()),
    }) as unknown as Sequelize;

  const buildStatementImportRepository = () =>
    ({
      create: jest
        .fn()
        .mockResolvedValue({ id: 'import-1', status: 'PENDING' }),
      update: jest.fn().mockResolvedValue([1]),
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'import-1', status: 'PROCESSING' }),
    }) as unknown as StatementImportRepository;

  const buildTransactionService = () =>
    ({
      getExistingDedupeKeys: jest.fn().mockResolvedValue(new Set()),
      findExistingExternalIds: jest.fn().mockResolvedValue(new Set()),
      detectRecurrenceForVendors: jest.fn().mockResolvedValue(new Map()),
      linkUnassignedVendorCharges: jest.fn().mockResolvedValue(undefined),
      bulkCreateForImport: jest
        .fn()
        .mockImplementation((_userId: string, rows: unknown[]) =>
          Promise.resolve(
            rows.map((_row, index) => ({ id: `transaction-${index + 1}` })),
          ),
        ),
    }) as unknown as TransactionService;

  // Backed by the real normalization utility so the pattern keys line up between the batch
  // resolver's map and formatRow's per-row lookup, exactly as they do in production.
  const buildVendorAliasService = (
    vendorIdByPattern: Record<string, string> = {},
  ) =>
    ({
      normalizePattern: jest.fn().mockImplementation(normalizeDescription),
      resolveVendorIdsBatch: jest
        .fn()
        .mockResolvedValue(new Map(Object.entries(vendorIdByPattern))),
      createManyIdempotent: jest.fn().mockResolvedValue(undefined),
    }) as unknown as VendorAliasService;

  const buildVendorClassifierService = () =>
    ({
      classify: jest.fn().mockResolvedValue(null),
      classifyConfirmedSubscriptions: jest.fn().mockResolvedValue([]),
      classifyBatch: jest.fn().mockResolvedValue([
        {
          vendorName: 'Netflix',
          category: TVendorCategory.STREAMING,
          serviceType: TServiceType.VIDEO_STREAMING,
          billingCycle: TBillingCycle.MONTHLY,
          estimatedAveragePrice: null,
          chargeKind: TChargeKind.SUBSCRIPTION,
        },
      ]),
    }) as unknown as VendorClassifierService;

  const buildCancellationContactService = () =>
    ({
      resolveForUser: jest.fn().mockResolvedValue(undefined),
    }) as unknown as CancellationContactService;

  const buildLeakResponseService = () =>
    ({
      scanAndRespond: jest.fn().mockResolvedValue(undefined),
    }) as unknown as LeakResponseService;

  it('confirms an AI-flagged subscription only once its charges show a cadence, at the lowered two-charge bar', async () => {
    const rows = buildRows([
      ['2026-01-15', 'NETFLIX.COM', '69.00', 'ILS', '69.00', 'ILS', '', ''],
      ['2026-02-15', 'NETFLIX.COM', '69.00', 'ILS', '69.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      name: 'Netflix',
      billingCycle: TBillingCycle.MONTHLY,
      category: TVendorCategory.STREAMING,
      chargeKind: TChargeKind.SUBSCRIPTION,
    };

    const findOrCreateManyByName = resolveEveryNameTo(vendor);
    const vendorService = {
      findOrCreateManyByName,
      getByIds: jest.fn().mockResolvedValue([vendor]),
    } as unknown as VendorService;

    const findOrCreateForImport = jest
      .fn()
      .mockResolvedValue({ id: 'subscription-1' });
    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const detectRecurrenceForVendors = jest.fn().mockImplementation(
      resolveRecurrenceForEveryVendor({
        amount: '69.00',
        currency: 'ILS',
        billingCycle: TBillingCycle.MONTHLY,
      }),
    );
    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendors,
    } as unknown as TransactionService;
    const classifyConfirmedSubscriptions = jest.fn();
    const classifierService = {
      ...buildVendorClassifierService(),
      classifyConfirmedSubscriptions,
    } as unknown as VendorClassifierService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      classifierService,
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(classifyConfirmedSubscriptions).not.toHaveBeenCalled();
    expect(findOrCreateManyByName).toHaveBeenCalledWith(
      [
        {
          name: 'Netflix',
          defaults: {
            averageMarketPrice: null,
            chargeKind: TChargeKind.SUBSCRIPTION,
            billingCycle: TBillingCycle.MONTHLY,
            category: TVendorCategory.STREAMING,
            serviceType: TServiceType.VIDEO_STREAMING,
          },
        },
      ],
      expect.anything(),
    );
    expect(detectRecurrenceForVendors).toHaveBeenCalledWith('user-1', [
      {
        vendorId: 'vendor-1',
        requiredCharges: RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.AI_FLAGGED,
      },
    ]);
    expect(findOrCreateForImport).toHaveBeenCalledTimes(1);
    expect(findOrCreateForImport).toHaveBeenCalledWith(
      'user-1',
      'vendor-1',
      '69.00',
      'ILS',
      TBillingCycle.MONTHLY,
      expect.anything(),
    );
  });

  it('never turns an essential bill into a subscription, even when the AI flagged it', async () => {
    const rows = buildRows([
      [
        '2026-01-10',
        'חברת החשמל לישראל-הו"ק',
        '164.87',
        'ILS',
        '164.87',
        'ILS',
        '',
        '',
      ],
    ]);

    const vendor = {
      id: 'vendor-4',
      name: 'Israel Electric Company',
      billingCycle: TBillingCycle.MONTHLY,
      category: TVendorCategory.UTILITIES,
      chargeKind: TChargeKind.SUBSCRIPTION,
    };

    const vendorService = {
      findOrCreateManyByName: resolveEveryNameTo(vendor),
      getByIds: jest.fn().mockResolvedValue([vendor]),
    } as unknown as VendorService;

    const findOrCreateForImport = jest.fn();
    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const detectRecurrenceForVendors = jest.fn().mockResolvedValue(new Map());
    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendors,
    } as unknown as TransactionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(detectRecurrenceForVendors).toHaveBeenCalledWith('user-1', []);
    expect(findOrCreateForImport).not.toHaveBeenCalled();
  });

  it('confirms a standing-order subscription from a single charge without waiting for a cadence', async () => {
    const rows = buildRows([
      [
        '2026-01-15',
        'ספייס גבעתיים-הו"ק',
        '99.00',
        'ILS',
        '99.00',
        'ILS',
        '',
        '',
      ],
    ]);

    const vendor = {
      id: 'vendor-5',
      name: 'Space Givatayim',
      billingCycle: TBillingCycle.MONTHLY,
      category: TVendorCategory.FITNESS,
      chargeKind: TChargeKind.SUBSCRIPTION,
    };

    const vendorService = {
      findOrCreateManyByName: resolveEveryNameTo(vendor),
      getByIds: jest.fn().mockResolvedValue([vendor]),
    } as unknown as VendorService;

    const findOrCreateForImport = jest
      .fn()
      .mockResolvedValue({ id: 'subscription-5' });
    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const detectRecurrenceForVendors = jest.fn().mockResolvedValue(new Map());
    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendors,
    } as unknown as TransactionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(detectRecurrenceForVendors).toHaveBeenCalledWith('user-1', []);
    expect(findOrCreateForImport).toHaveBeenCalledWith(
      'user-1',
      'vendor-5',
      '99.00',
      'ILS',
      TBillingCycle.MONTHLY,
      expect.anything(),
    );
  });

  it('never creates a subscription when the vendor was not flagged as subscription-like', async () => {
    const rows = buildRows([
      ['2026-01-15', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-02-15', 'CARREFOUR', '72.34', 'ILS', '72.34', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-2',
      billingCycle: null,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const vendorAliasService = buildVendorAliasService();
    const vendorService = {
      findOrCreateManyByName: resolveEveryNameTo(vendor),
      getByIds: jest.fn().mockResolvedValue([vendor]),
    } as unknown as VendorService;

    const findOrCreateForImport = jest.fn();
    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const classifierService = {
      classify: jest.fn().mockResolvedValue(null),
      classifyBatch: jest.fn().mockResolvedValue([
        {
          vendorName: 'Carrefour',
          category: TVendorCategory.GROCERIES,
          serviceType: TServiceType.NONE,
          billingCycle: null,
          estimatedAveragePrice: null,
          chargeKind: TChargeKind.ONE_OFF,
        },
      ]),
    } as unknown as VendorClassifierService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      buildTransactionService(),
      vendorAliasService,
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      classifierService,
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(findOrCreateForImport).not.toHaveBeenCalled();
  });

  it('confirms a subscription for this user from recurring charges even when the AI classified the vendor as not subscription-like', async () => {
    const rows = buildRows([
      ['2026-01-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
      ['2026-02-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
      ['2026-03-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-3',
      name: 'Gym Club',
      billingCycle: null,
      category: TVendorCategory.OTHER,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const promoteToSubscription = jest.fn().mockResolvedValue(undefined);
    const vendorService = {
      promoteToSubscription,
      findOrCreateManyByName: resolveEveryNameTo(vendor),
      getByIds: jest.fn().mockResolvedValue([vendor]),
    } as unknown as VendorService;

    const findOrCreateForImport = jest
      .fn()
      .mockResolvedValue({ id: 'subscription-2' });
    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const detectRecurrenceForVendors = jest.fn().mockImplementation(
      resolveRecurrenceForEveryVendor({
        amount: '99.00',
        currency: 'ILS',
        billingCycle: TBillingCycle.MONTHLY,
      }),
    );
    const linkUnassignedVendorCharges = jest.fn().mockResolvedValue(undefined);
    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendors,
      linkUnassignedVendorCharges,
    } as unknown as TransactionService;

    const classifyConfirmedSubscriptions = jest.fn().mockResolvedValue([
      {
        vendorName: 'Gym Club',
        category: TVendorCategory.LEISURE_SPORTS,
        serviceType: TServiceType.GYM_MEMBERSHIP,
        billingCycle: TBillingCycle.MONTHLY,
        estimatedAveragePrice: null,
        chargeKind: TChargeKind.SUBSCRIPTION,
      },
    ]);
    const classifierService = {
      classifyConfirmedSubscriptions,
      classify: jest.fn().mockResolvedValue(null),
      classifyBatch: jest.fn().mockResolvedValue([
        {
          vendorName: 'Gym Club',
          category: TVendorCategory.OTHER,
          serviceType: TServiceType.NONE,
          billingCycle: null,
          estimatedAveragePrice: null,
          chargeKind: TChargeKind.ONE_OFF,
        },
      ]),
    } as unknown as VendorClassifierService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      classifierService,
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(detectRecurrenceForVendors).toHaveBeenCalledTimes(1);
    expect(detectRecurrenceForVendors).toHaveBeenCalledWith('user-1', [
      {
        vendorId: 'vendor-3',
        requiredCharges: RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.UNFLAGGED,
      },
    ]);
    expect(findOrCreateForImport).toHaveBeenCalledWith(
      'user-1',
      'vendor-3',
      '99.00',
      'ILS',
      TBillingCycle.MONTHLY,
      expect.anything(),
    );
    expect(linkUnassignedVendorCharges).toHaveBeenCalledWith(
      'user-1',
      'vendor-3',
      'subscription-2',
      expect.anything(),
    );
    expect(classifyConfirmedSubscriptions).toHaveBeenCalledWith(['GYM CLUB']);
    expect(promoteToSubscription).toHaveBeenCalledWith(vendor, {
      billingCycle: TBillingCycle.MONTHLY,
      serviceType: TServiceType.GYM_MEMBERSHIP,
    });
  });

  it('still completes the import when promoting a confirmed vendor fails', async () => {
    const rows = buildRows([
      ['2026-01-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
      ['2026-02-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-3',
      name: 'Gym Club',
      billingCycle: null,
      category: TVendorCategory.OTHER,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const promoteToSubscription = jest.fn();
    const vendorService = {
      promoteToSubscription,
      findOrCreateManyByName: resolveEveryNameTo(vendor),
      getByIds: jest.fn().mockResolvedValue([vendor]),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest
        .fn()
        .mockResolvedValue({ id: 'subscription-2' }),
    } as unknown as SubscriptionService;

    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendors: jest.fn().mockImplementation(
        resolveRecurrenceForEveryVendor({
          amount: '99.00',
          currency: 'ILS',
          billingCycle: TBillingCycle.MONTHLY,
        }),
      ),
    } as unknown as TransactionService;

    const classifierService = {
      ...buildVendorClassifierService(),
      classifyConfirmedSubscriptions: jest
        .fn()
        .mockRejectedValue(new Error('AI unavailable')),
    } as unknown as VendorClassifierService;

    const updateImport = jest.fn().mockResolvedValue([1]);
    const statementImportRepository = {
      ...buildStatementImportRepository(),
      update: updateImport,
    } as unknown as StatementImportRepository;
    const scanAndRespond = jest.fn().mockResolvedValue(undefined);
    const leakResponseService = {
      scanAndRespond,
    } as unknown as LeakResponseService;
    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      leakResponseService,
      buildCancellationContactService(),
      classifierService,
      statementImportRepository,
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(promoteToSubscription).not.toHaveBeenCalled();
    expect(updateImport).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'COMPLETED' }),
    );
    expect(scanAndRespond).toHaveBeenCalledTimes(1);
  });

  it('never checks habitual-spending categories like groceries for recurrence', async () => {
    const rows = buildRows([
      ['2026-01-15', 'CARREFOUR', '70.00', 'ILS', '70.00', 'ILS', '', ''],
      ['2026-02-15', 'CARREFOUR', '70.00', 'ILS', '70.00', 'ILS', '', ''],
      ['2026-03-15', 'CARREFOUR', '70.00', 'ILS', '70.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-2',
      name: 'Carrefour',
      billingCycle: null,
      category: TVendorCategory.GROCERIES,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const vendorService = {
      findOrCreateManyByName: resolveEveryNameTo(vendor),
      getByIds: jest.fn().mockResolvedValue([vendor]),
    } as unknown as VendorService;

    const findOrCreateForImport = jest.fn();
    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const detectRecurrenceForVendors = jest.fn().mockResolvedValue(new Map());
    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendors,
    } as unknown as TransactionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(detectRecurrenceForVendors).toHaveBeenCalledWith('user-1', []);
    expect(findOrCreateForImport).not.toHaveBeenCalled();
  });

  it('bulk-creates every formatted row in a single call and scans for leaks once', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-11', 'RAMI LEVY', '42.00', 'ILS', '42.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
      [normalizeDescription('RAMI LEVY')]: 'vendor-1',
    });

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([vendor]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const bulkCreateForImport = jest
      .fn()
      .mockImplementation((_userId: string, rows: unknown[]) =>
        Promise.resolve(
          rows.map((_row, index) => ({ id: `transaction-${index + 1}` })),
        ),
      );
    const transactionService = {
      ...buildTransactionService(),
      bulkCreateForImport,
    } as unknown as TransactionService;

    const scanAndRespond = jest.fn().mockResolvedValue(undefined);
    const leakResponseService = {
      scanAndRespond,
    } as unknown as LeakResponseService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      vendorAliasService,
      subscriptionService,
      leakResponseService,
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).toHaveBeenCalledTimes(1);
    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ amount: '68.11', vendorId: 'vendor-1' }),
      expect.objectContaining({ amount: '42.00', vendorId: 'vendor-1' }),
    ]);
    expect(scanAndRespond).toHaveBeenCalledTimes(1);
    expect(scanAndRespond).toHaveBeenCalledWith('user-1', 'import-1');
  });

  it('skips a row whose external id already exists for the user, without bulk-inserting it', async () => {
    const rows = buildRows([
      [
        '2026-01-10',
        'CARREFOUR',
        '68.11',
        'ILS',
        '68.11',
        'ILS',
        'VOUCHER-1',
        '',
      ],
      [
        '2026-01-11',
        'RAMI LEVY',
        '42.00',
        'ILS',
        '42.00',
        'ILS',
        'VOUCHER-2',
        '',
      ],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
      [normalizeDescription('RAMI LEVY')]: 'vendor-1',
    });

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([vendor]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const bulkCreateForImport = jest
      .fn()
      .mockImplementation((_userId: string, rows: unknown[]) =>
        Promise.resolve(
          rows.map((_row, index) => ({ id: `transaction-${index + 1}` })),
        ),
      );
    const transactionService = {
      ...buildTransactionService(),
      bulkCreateForImport,
      findExistingExternalIds: jest
        .fn()
        .mockResolvedValue(new Set(['VOUCHER-1'])),
    } as unknown as TransactionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ externalId: 'VOUCHER-2' }),
    ]);
  });

  it('skips a row that duplicates another row in the same file by date and amount', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
    });

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([vendor]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const bulkCreateForImport = jest
      .fn()
      .mockImplementation((_userId: string, rows: unknown[]) =>
        Promise.resolve(
          rows.map((_row, index) => ({ id: `transaction-${index + 1}` })),
        ),
      );
    const transactionService = {
      ...buildTransactionService(),
      bulkCreateForImport,
    } as unknown as TransactionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ amount: '68.11' }),
    ]);
  });

  it('skips a row that matches a transaction already stored by date and amount', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-11', 'RAMI LEVY', '42', 'ILS', '42', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([vendor]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const bulkCreateForImport = jest.fn().mockResolvedValue([{ id: 't-1' }]);
    const transactionService = {
      ...buildTransactionService(),
      bulkCreateForImport,
      getExistingDedupeKeys: jest
        .fn()
        .mockResolvedValue(new Set(['2026-01-11|42.00'])),
    } as unknown as TransactionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService({
        [normalizeDescription('CARREFOUR')]: 'vendor-1',
        [normalizeDescription('RAMI LEVY')]: 'vendor-1',
      }),
      {
        getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
        findOrCreateForImport: jest.fn(),
      } as unknown as SubscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ originalDescription: 'CARREFOUR' }),
    ]);
  });

  it('completes the import before enrichment, so a failing leak scan cannot fail or taint it', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-11', 'RAMI LEVY', '42.00', 'ILS', '42.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      chargeKind: TChargeKind.ONE_OFF,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
      [normalizeDescription('RAMI LEVY')]: 'vendor-1',
    });

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([vendor]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const transactionService = buildTransactionService();
    const scanAndRespond = jest.fn().mockRejectedValue(new Error('scan boom'));
    const leakResponseService = {
      scanAndRespond,
    } as unknown as LeakResponseService;

    const update = jest.fn().mockResolvedValue([1]);
    const statementImportRepository = {
      ...buildStatementImportRepository(),
      update,
    } as unknown as StatementImportRepository;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      vendorAliasService,
      subscriptionService,
      leakResponseService,
      buildCancellationContactService(),
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'COMPLETED', transactionCount: 2 }),
    );

    const [, statusPatch] = update.mock.calls.at(-1) as [
      string,
      { errorMessage: string | null },
    ];
    const [completedAt] = update.mock.invocationCallOrder.slice(-1);
    const [scannedAt] = scanAndRespond.mock.invocationCallOrder;

    expect(statusPatch.errorMessage).toBeNull();
    expect(completedAt).toBeLessThan(scannedAt);
  });

  it('marks the import as failed when the vendor lookup fails', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorAliasService = {
      normalizePattern: jest.fn().mockImplementation(normalizeDescription),
      resolveVendorIdsBatch: jest
        .fn()
        .mockRejectedValue(new Error('lookup boom')),
      createManyIdempotent: jest.fn(),
    } as unknown as VendorAliasService;

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const bulkCreateForImport = jest.fn();
    const transactionService = {
      ...buildTransactionService(),
      bulkCreateForImport,
    } as unknown as TransactionService;

    const update = jest.fn().mockResolvedValue([1]);
    const statementImportRepository = {
      ...buildStatementImportRepository(),
      update,
    } as unknown as StatementImportRepository;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).not.toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('returns the import immediately in PROCESSING status and defers the pipeline via waitUntil', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      buildTransactionService(),
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    const result = await service.startBankImport(
      'user-1',
      buildBankImport(rows),
    );

    expect(result).toEqual(
      expect.objectContaining({ id: 'import-1', status: 'PROCESSING' }),
    );
    expect(waitUntilMock).toHaveBeenCalledTimes(1);

    await flushDeferredPipeline();
  });

  it('records the import as a bank sync and reports the rows the scraper could not map', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([]),
      findOrCreateManyByName: jest.fn().mockResolvedValue(new Map()),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const create = jest
      .fn()
      .mockResolvedValue({ id: 'import-1', status: 'PENDING' });
    const update = jest.fn().mockResolvedValue([1]);
    const statementImportRepository = {
      ...buildStatementImportRepository(),
      create,
      update,
    } as unknown as StatementImportRepository;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      buildTransactionService(),
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.startBankImport('user-1', {
      rows,
      bankConnectionId: 'connection-1',
      rowErrors: ['2026-01-11: missing description'],
    });
    await flushDeferredPipeline();

    expect(create).toHaveBeenCalledWith({
      userId: 'user-1',
      source: 'BANK_API',
      bankConnectionId: 'connection-1',
    });
    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({
        status: 'COMPLETED',
        errorMessage: '2026-01-11: missing description',
      }),
    );
  });

  it('marks the import as failed when the deferred pipeline throws outside the row loop', async () => {
    const rows = buildRows([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorService = {
      getByIds: jest.fn().mockResolvedValue([]),
      findOrCreateManyByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      getActiveIdsByVendor: jest.fn().mockResolvedValue(new Map()),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const transactionService = {
      ...buildTransactionService(),
      findExistingExternalIds: jest
        .fn()
        .mockRejectedValue(new Error('db is down')),
    } as unknown as TransactionService;

    const update = jest.fn().mockResolvedValue([1]);
    const statementImportRepository = {
      ...buildStatementImportRepository(),
      update,
    } as unknown as StatementImportRepository;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildCancellationContactService(),
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.startBankImport('user-1', buildBankImport(rows));
    await flushDeferredPipeline();

    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });
});
