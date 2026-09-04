import * as XLSX from 'xlsx';
import { Sequelize } from 'sequelize';
import { VendorService } from '@Modules/vendor/vendor.service';
import { InsightService } from '@Modules/insight/insight.service';
import { StatementImportService } from './statement-import.service';
import { StatementImportRepository } from './statement-import.repository';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { VendorAliasService } from '@Modules/vendor-alias/vendor-alias.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';
import { VendorClassifierService } from '@Modules/vendor-classifier/vendor-classifier.service';

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

describe('StatementImportService', () => {
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
        .mockResolvedValue({ id: 'import-1', status: 'PENDING' }),
    }) as unknown as StatementImportRepository;

  const buildTransactionService = () =>
    ({
      isDuplicate: jest.fn().mockResolvedValue(false),
      createForImport: jest.fn().mockResolvedValue({ id: 'transaction-1' }),
      getAverageAmountForUser: jest
        .fn()
        .mockResolvedValue({ average: 50, count: 3 }),
      findExistingExternalIds: jest.fn().mockResolvedValue(new Set()),
      getAverageAmountForVendor: jest
        .fn()
        .mockResolvedValue({ average: 50, count: 3 }),
      bulkCreateForImport: jest
        .fn()
        .mockImplementation((_userId: string, rows: unknown[]) =>
          Promise.resolve(
            rows.map((_row, index) => ({ id: `transaction-${index + 1}` })),
          ),
        ),
    }) as unknown as TransactionService;

  const buildVendorClassifierService = () =>
    ({
      classify: jest.fn().mockResolvedValue({
        vendorName: 'Netflix',
        category: TVendorCategory.STREAMING,
        serviceType: TServiceType.VIDEO_STREAMING,
        billingCycle: TBillingCycle.MONTHLY,
        cancellationEmail: null,
        estimatedAveragePrice: null,
        isLikelySubscription: true,
      }),
    }) as unknown as VendorClassifierService;

  const buildInsightService = () =>
    ({
      generateForSubscription: jest.fn().mockResolvedValue(undefined),
      generateForTransaction: jest.fn().mockResolvedValue(undefined),
    }) as unknown as InsightService;

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

    const resolveVendorId = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('vendor-1');
    const vendorAliasService = {
      resolveVendorId,
      createIdempotent: jest.fn().mockResolvedValue('vendor-1'),
    } as unknown as VendorAliasService;

    const findOrCreateByName = jest.fn().mockResolvedValue(vendor);
    const getById = jest.fn().mockResolvedValue(vendor);
    const vendorService = {
      findOrCreateByName,
      getById,
    } as unknown as VendorService;

    const findFirstActiveByVendor = jest.fn().mockResolvedValue(null);
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
      buildInsightService(),
      buildTransactionService(),
      vendorAliasService,
      subscriptionService,
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.processUpload('user-1', buildFile(buffer));

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

    const resolveVendorId = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('vendor-2');
    const vendorAliasService = {
      resolveVendorId,
      createIdempotent: jest.fn().mockResolvedValue('vendor-2'),
    } as unknown as VendorAliasService;

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
      classify: jest.fn().mockResolvedValue({
        vendorName: 'Carrefour',
        category: TVendorCategory.GROCERIES,
        serviceType: TServiceType.NONE,
        billingCycle: null,
        cancellationEmail: null,
        estimatedAveragePrice: null,
        isLikelySubscription: false,
      }),
    } as unknown as VendorClassifierService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      buildInsightService(),
      buildTransactionService(),
      vendorAliasService,
      subscriptionService,
      classifierService,
      buildStatementImportRepository(),
    );

    await service.processUpload('user-1', buildFile(buffer));

    expect(findOrCreateForImport).not.toHaveBeenCalled();
  });

  it('bulk-creates every formatted row in a single call and generates insights for each', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-11', 'RAMI LEVY', '42.00', 'ILS', '42.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      isLikelySubscription: false,
    };

    const vendorAliasService = {
      resolveVendorId: jest.fn().mockResolvedValue('vendor-1'),
      createIdempotent: jest.fn(),
    } as unknown as VendorAliasService;

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

    const generateForTransaction = jest.fn().mockResolvedValue(undefined);
    const insightService = {
      generateForSubscription: jest.fn().mockResolvedValue(undefined),
      generateForTransaction,
    } as unknown as InsightService;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      insightService,
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.processUpload('user-1', buildFile(buffer));

    expect(bulkCreateForImport).toHaveBeenCalledTimes(1);
    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ amount: '68.11', vendorId: 'vendor-1' }),
      expect.objectContaining({ amount: '42.00', vendorId: 'vendor-1' }),
    ]);
    expect(generateForTransaction).toHaveBeenCalledTimes(2);
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

    const vendorAliasService = {
      resolveVendorId: jest.fn().mockResolvedValue('vendor-1'),
      createIdempotent: jest.fn(),
    } as unknown as VendorAliasService;

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
      buildInsightService(),
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.processUpload('user-1', buildFile(buffer));

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

    const vendorAliasService = {
      resolveVendorId: jest.fn().mockResolvedValue('vendor-1'),
      createIdempotent: jest.fn(),
    } as unknown as VendorAliasService;

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
      buildInsightService(),
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildVendorClassifierService(),
      buildStatementImportRepository(),
    );

    await service.processUpload('user-1', buildFile(buffer));

    expect(bulkCreateForImport).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ amount: '68.11' }),
    ]);
  });

  it('does not undercount successful imports when insight generation fails for one row', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
      ['2026-01-11', 'RAMI LEVY', '42.00', 'ILS', '42.00', 'ILS', '', ''],
    ]);

    const vendor = {
      id: 'vendor-1',
      billingCycle: null,
      isLikelySubscription: false,
    };

    const vendorAliasService = {
      resolveVendorId: jest.fn().mockResolvedValue('vendor-1'),
      createIdempotent: jest.fn(),
    } as unknown as VendorAliasService;

    const vendorService = {
      getById: jest.fn().mockResolvedValue(vendor),
      findOrCreateByName: jest.fn(),
    } as unknown as VendorService;

    const subscriptionService = {
      findFirstActiveByVendor: jest.fn().mockResolvedValue(null),
      findOrCreateForImport: jest.fn(),
    } as unknown as SubscriptionService;

    const transactionService = buildTransactionService();
    const insightService = {
      generateForSubscription: jest.fn().mockResolvedValue(undefined),
      generateForTransaction: jest
        .fn()
        .mockRejectedValueOnce(new Error('insight boom'))
        .mockResolvedValueOnce(undefined),
    } as unknown as InsightService;

    const update = jest.fn().mockResolvedValue([1]);
    const statementImportRepository = {
      ...buildStatementImportRepository(),
      update,
    } as unknown as StatementImportRepository;

    const service = new StatementImportService(
      buildSequelize(),
      vendorService,
      insightService,
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.processUpload('user-1', buildFile(buffer));

    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'COMPLETED', transactionCount: 2 }),
    );

    const [, statusPatch] = update.mock.calls.at(-1) as [
      string,
      { errorMessage?: string },
    ];

    expect(statusPatch.errorMessage).toContain('Insight generation failed');
  });

  it('marks the import as failed when every row fails to format', async () => {
    const buffer = buildWorkbookBuffer([
      ['2026-01-10', 'CARREFOUR', '68.11', 'ILS', '68.11', 'ILS', '', ''],
    ]);

    const vendorAliasService = {
      resolveVendorId: jest.fn().mockRejectedValue(new Error('lookup boom')),
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
      buildInsightService(),
      transactionService,
      vendorAliasService,
      subscriptionService,
      buildVendorClassifierService(),
      statementImportRepository,
    );

    await service.processUpload('user-1', buildFile(buffer));

    expect(bulkCreateForImport).not.toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith(
      'import-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });
});
