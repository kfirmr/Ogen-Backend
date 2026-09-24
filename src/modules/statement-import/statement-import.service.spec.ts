import * as XLSX from 'xlsx';
import { Sequelize } from 'sequelize';
import { VendorService } from '@Modules/vendor/vendor.service';
import { StatementImportService } from './statement-import.service';
import { StatementImportRepository } from './statement-import.repository';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { VendorAliasService } from '@Modules/vendor-alias/vendor-alias.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { LeakResponseService } from '@Modules/leak-response/leak-response.service';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';
import { normalizeDescription } from '@Modules/vendor-alias/utilities/description.utility';
import { VendorClassifierService } from '@Modules/vendor-classifier/vendor-classifier.service';

const capturedPipelinePromise: { current: Promise<void> | null } = {
  current: null,
};
const waitUntilMock = jest.fn((promise: Promise<void>) => {
  capturedPipelinePromise.current = promise;
});

jest.mock('@vercel/functions', () => ({
  waitUntil: (promise: Promise<void>) => waitUntilMock(promise),
}));

const HEADERS = [
  'תאריך רכישה',
  'שם בית עסק',
  'סכום עסקה',
  'מטבע עסקה',
  'סכום חיוב',
  'מטבע חיוב',
  "מס' שובר",
  'פירוט נוסף',
];

const buildWorkbookBuffer = (rows: unknown[][]): Buffer => {
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

const buildFile = (buffer: Buffer) =>
  ({ buffer, originalname: 'statement.xlsx' }) as Express.Multer.File;

// startUpload only kicks off the background pipeline via waitUntil; tests await the promise
// captured from the mocked waitUntil to observe the pipeline's side effects.
const flushDeferredPipeline = async (): Promise<void> => {
  await capturedPipelinePromise.current;
};

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
      isDuplicate: jest.fn().mockResolvedValue(false),
      findExistingExternalIds: jest.fn().mockResolvedValue(new Set()),
      detectRecurrenceForVendor: jest.fn().mockResolvedValue(null),
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
      createIdempotent: jest.fn().mockResolvedValue('vendor-1'),
    }) as unknown as VendorAliasService;

  const buildVendorClassifierService = () =>
    ({
      classify: jest.fn().mockResolvedValue(null),
      classifyBatch: jest.fn().mockResolvedValue([
        {
          vendorName: 'Netflix',
          category: TVendorCategory.STREAMING,
          serviceType: TServiceType.VIDEO_STREAMING,
          billingCycle: TBillingCycle.MONTHLY,
          cancellationEmail: null,
          estimatedAveragePrice: null,
          isLikelySubscription: true,
        },
      ]),
    }) as unknown as VendorClassifierService;

  const buildLeakResponseService = () =>
    ({
      scanAndRespond: jest.fn().mockResolvedValue(undefined),
    }) as unknown as LeakResponseService;

  it('does not create a subscription off the vendor first sighting, only once a second charge confirms it', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-15', 'NETFLIX.COM', '69.00', 'ILS', '69.00', 'ILS', '', ''],
      ['2026-02-15', 'NETFLIX.COM', '69.00', 'ILS', '69.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: TBillingCycle.MONTHLY,
      isLikelySubscription: true,
    };

    const vendorAliasService = buildVendorAliasService();
    const findOrCreateByName = jest.fn().mockResolvedValue(vendor);
    const getById = jest.fn().mockResolvedValue(vendor);
    const vendorService = {
      findOrCreateByName,
      getById,
    } as unknown as VendorService;

    // Both rows resolve to the same vendor up front (batched resolution), so the first row's
    // own findOrCreateForImport call is what a real DB would have the second row's
    // findFirstActiveByVendor lookup find already committed.
    const findFirstActiveByVendor = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'subscription-1' });
    const findOrCreateForImport = jest
      .fn()
      .mockResolvedValue({ id: 'subscription-1' });
    const subscriptionService = {
      findFirstActiveByVendor,
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      buildTransactionService(),
      vendorAliasService,
      subscriptionService,
      buildLeakResponseService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(findOrCreateByName).toHaveBeenCalledWith(
      'Netflix',
      expect.objectContaining({
        isLikelySubscription: true,
        billingCycle: TBillingCycle.MONTHLY,
      }),
      expect.anything(),
    );
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

  it('never creates a subscription when the vendor was not flagged as subscription-like', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-15', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-02-15', 'CARREFOUR', '72.34', 'ILS', '72.34', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-2',
      billingCycle: null,
      isLikelySubscription: false,
    };

    const vendorAliasService = buildVendorAliasService();
    const vendorService = {
      findOrCreateByName: jest.fn().mockResolvedValue(vendor),
      getById: jest.fn().mockResolvedValue(vendor),
    } as unknown as VendorService;

    const findOrCreateForImport = jest.fn();
    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
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
          cancellationEmail: null,
          estimatedAveragePrice: null,
          isLikelySubscription: false,
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
      classifierService,
      buildStatementImportRepository(),
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(findOrCreateForImport).not.toHaveBeenCalled();
  });

  it('confirms a subscription for this user from recurring charges even when the AI classified the vendor as not subscription-like', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
      ['2026-02-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
      ['2026-03-15', 'GYM CLUB', '99.00', 'ILS', '99.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-3',
      name: 'Gym Club',
      billingCycle: null,
      category: TVendorCategory.OTHER,
      isLikelySubscription: false,
    };

    const vendorService = {
      findOrCreateByName: jest.fn().mockResolvedValue(vendor),
      getById: jest.fn().mockResolvedValue(vendor),
    } as unknown as VendorService;

    const findOrCreateForImport = jest
      .fn()
      .mockResolvedValue({ id: 'subscription-2' });
    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const detectRecurrenceForVendor = jest.fn().mockResolvedValue({
      amount: '99.00',
      currency: 'ILS',
      billingCycle: TBillingCycle.MONTHLY,
    });
    const linkUnassignedVendorCharges = jest.fn().mockResolvedValue(undefined);
    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendor,
      linkUnassignedVendorCharges,
    } as unknown as TransactionService;

    const classifierService = {
      classify: jest.fn().mockResolvedValue(null),
      classifyBatch: jest.fn().mockResolvedValue([
        {
          vendorName: 'Gym Club',
          category: TVendorCategory.OTHER,
          serviceType: TServiceType.NONE,
          billingCycle: null,
          cancellationEmail: null,
          estimatedAveragePrice: null,
          isLikelySubscription: false,
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
      classifierService,
      buildStatementImportRepository(),
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(detectRecurrenceForVendor).toHaveBeenCalledTimes(1);
    expect(detectRecurrenceForVendor).toHaveBeenCalledWith(
      'user-1',
      'vendor-3',
    );
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
  });

  it('never checks habitual-spending categories like groceries for recurrence', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-15', 'CARREFOUR', '70.00', 'ILS', '70.00', 'ILS', '', ''],
      ['2026-02-15', 'CARREFOUR', '70.00', 'ILS', '70.00', 'ILS', '', ''],
      ['2026-03-15', 'CARREFOUR', '70.00', 'ILS', '70.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-2',
      name: 'Carrefour',
      billingCycle: null,
      category: TVendorCategory.GROCERIES,
      isLikelySubscription: false,
    };

    const vendorService = {
      findOrCreateByName: jest.fn().mockResolvedValue(vendor),
      getById: jest.fn().mockResolvedValue(vendor),
    } as unknown as VendorService;

    const findOrCreateForImport = jest.fn();
    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
      findOrCreateForImport,
    } as unknown as SubscriptionService;

    const detectRecurrenceForVendor = jest.fn();
    const transactionService = {
      ...buildTransactionService(),
      detectRecurrenceForVendor,
    } as unknown as TransactionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      transactionService,
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(detectRecurrenceForVendor).not.toHaveBeenCalled();
    expect(findOrCreateForImport).not.toHaveBeenCalled();
  });

  it('bulk-creates every formatted row in a single call and scans for leaks once', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-11', 'RAMI LEVY', '42.00', 'ILS', '42.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      isLikelySubscription: false,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
      [normalizeDescription('RAMI LEVY')]: 'vendor-1',
    });

    const vendorService = {
      getById: jest.fn().mockResolvedValue(vendor),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
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
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startUpload('user-1', buildFile(buffer));
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
    const buffer = buildWorkbookBuffer([
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
      isLikelySubscription: false,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
      [normalizeDescription('RAMI LEVY')]: 'vendor-1',
    });

    const vendorService = {
      getById: jest.fn().mockResolvedValue(vendor),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
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
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ externalId: 'VOUCHER-2' }),
    ]);
  });

  it('skips a row that duplicates another row in the same file by date and amount', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      isLikelySubscription: false,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
    });

    const vendorService = {
      getById: jest.fn().mockResolvedValue(vendor),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
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
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ amount: '68.11' }),
    ]);
  });

  it('does not undercount successful imports when leak detection fails', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-11', 'RAMI LEVY', '42.00', 'ILS', '42.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      isLikelySubscription: false,
    };

    const vendorAliasService = buildVendorAliasService({
      [normalizeDescription('CARREFOUR')]: 'vendor-1',
      [normalizeDescription('RAMI LEVY')]: 'vendor-1',
    });

    const vendorService = {
      getById: jest.fn().mockResolvedValue(vendor),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const transactionService = buildTransactionService();
    const leakResponseService = {
      scanAndRespond: jest.fn().mockRejectedValue(new Error('scan boom')),
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
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'COMPLETED', transactionCount: 2 }),
    );

    const [, statusPatch] = update.mock.calls.at(-1) as [
      string,
      { errorMessage?: string },
    ];

    expect(statusPatch.errorMessage).toContain('Leak detection failed');
  });

  it('marks the import as failed when every row fails to format', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorAliasService = {
      normalizePattern: jest.fn().mockImplementation(normalizeDescription),
      resolveVendorIdsBatch: jest
        .fn()
        .mockRejectedValue(new Error('lookup boom')),
      createIdempotent: jest.fn(),
    } as unknown as VendorAliasService;

    const vendorService = {
      getById: jest.fn(),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn(),
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
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(bulkCreateForImport).not.toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('returns the import immediately in PROCESSING status and defers the pipeline via waitUntil', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorService = {
      getById: jest.fn(),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn(),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      buildTransactionService(),
      buildVendorAliasService(),
      subscriptionService,
      buildLeakResponseService(),
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    const result = await service.startUpload('user-1', buildFile(buffer));

    expect(result).toEqual(
      expect.objectContaining({ id: 'import-1', status: 'PROCESSING' }),
    );
    expect(waitUntilMock).toHaveBeenCalledTimes(1);

    await flushDeferredPipeline();
  });

  it('marks the import as failed when the deferred pipeline throws outside the row loop', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorService = {
      getById: jest.fn(),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn(),
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
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.startUpload('user-1', buildFile(buffer));
    await flushDeferredPipeline();

    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });
});
