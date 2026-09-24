import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  parseTransactionRows,
  IParsedTransactionRow,
} from './utilities/xlsx-parser.utility';

import {
  TImportStatus,
  TERMINAL_IMPORT_STATUSES,
} from './constants/import-status.constant';

import { Sequelize } from 'sequelize';
import { waitUntil } from '@vercel/functions';
import { DATA_LENGTHS } from '@Constants/data-length';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { VendorService } from '@Modules/vendor/vendor.service';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { TImportSource } from './constants/import-source.constant';
import { ProviderNames } from '@Providers/database/provider-names';
import { StatementImport } from './entities/statement-import.entity';
import { UpdateImportStatusDto } from './dto/update-import-status.dto';
import { normalizeError } from '../../utilities/normalize-error.utility';
import { GetStatementImportsDto } from './dto/get-statement-imports.dto';
import { StatementImportRepository } from './statement-import.repository';
import { CreateStatementImportDto } from './dto/create-statement-import.dto';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { VendorAliasService } from '@Modules/vendor-alias/vendor-alias.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { IMPORT_STATUS_PATCH_BY_STATUS } from './constants/status-patch.constant';
import { LeakResponseService } from '@Modules/leak-response/leak-response.service';
import { VendorClassifierService } from '@Modules/vendor-classifier/vendor-classifier.service';
import { NON_SUBSCRIPTION_CATEGORIES } from '@Modules/vendor/constants/vendor-category.constant';
import { TCreateTransactionForImport } from '@Modules/transaction/interfaces/transaction.interface';
import { IVendorClassification } from '@Modules/vendor-classifier/interfaces/vendor-classification.interface';

interface IRowDedupeState {
  seenKeys: Set<string>;
  seenExternalIds: Set<string>;
  existingExternalIds: Set<string>;
}

interface IPreparedTransactionRow {
  vendor: Vendor | null;
  data: TCreateTransactionForImport;
}

@Injectable()
export class StatementImportService {
  private readonly logger = new TypedLogger('StatementImportService');

  constructor(
    @Inject(ProviderNames.SEQUELIZE)
    private readonly sequelize: Sequelize,
    private readonly vendorService: VendorService,
    private readonly transactionService: TransactionService,
    private readonly vendorAliasService: VendorAliasService,
    private readonly subscriptionService: SubscriptionService,
    private readonly leakResponseService: LeakResponseService,
    private readonly vendorClassifierService: VendorClassifierService,
    private readonly statementImportRepository: StatementImportRepository,
  ) {}

  public getByUser(
    userId: string,
    data: GetStatementImportsDto,
  ): Promise<IBatchResult<StatementImport>> {
    return this.statementImportRepository.getByUser(userId, data);
  }

  public async getById(id: string, userId: string): Promise<StatementImport> {
    const statementImport = await this.statementImportRepository.findById(
      id,
      userId,
    );

    if (statementImport == null) {
      throw new NotFoundException('Statement import not found');
    }

    return statementImport;
  }

  public create(
    userId: string,
    data: CreateStatementImportDto,
  ): Promise<StatementImport> {
    return this.statementImportRepository.create({
      userId,
      source: data.source,
      filename: data.filename ?? null,
    });
  }

  // Returns as soon as the import is recorded and marked PROCESSING; the actual parsing,
  // classification, insertion, and leak detection continue in the background via waitUntil
  // (see failImport for why a crash there still has to reach the row instead of vanishing).
  public async startUpload(
    userId: string,
    file: Express.Multer.File,
  ): Promise<StatementImport> {
    if (file == null) {
      throw new BadRequestException('No file uploaded');
    }

    const { rows, parseErrors, headerError } = parseTransactionRows(
      file.buffer,
    );

    if (headerError != null) {
      throw new BadRequestException(headerError);
    }

    const statementImport = await this.create(userId, {
      source: TImportSource.XLSX,
      filename: file.originalname,
    });

    const processingImport = await this.updateStatus(
      statementImport.id,
      userId,
      { status: TImportStatus.PROCESSING },
    );

    waitUntil(
      this.runImportPipeline(
        userId,
        processingImport.id,
        rows,
        parseErrors,
      ).catch((error) => this.failImport(processingImport.id, userId, error)),
    );

    return processingImport;
  }

  private async runImportPipeline(
    userId: string,
    importId: string,
    rows: IParsedTransactionRow[],
    parseErrors: string[],
  ): Promise<void> {
    const rowErrors = [...parseErrors];
    const dedupeState: IRowDedupeState = {
      seenKeys: new Set(),
      seenExternalIds: new Set(),
      existingExternalIds:
        await this.transactionService.findExistingExternalIds(
          userId,
          rows
            .map((row) => row.externalId)
            .filter((externalId): externalId is string => externalId != null),
        ),
    };

    const vendorByPattern = await this.resolveVendorsForRows(rows);
    const preparedRows: IPreparedTransactionRow[] = [];

    for (const row of rows) {
      try {
        const preparedRow = await this.formatRow(
          userId,
          importId,
          row,
          vendorByPattern,
          dedupeState,
        );

        if (preparedRow != null) {
          preparedRows.push(preparedRow);
        }
      } catch (error) {
        this.logger.error({
          message: 'Failed to ingest statement row',
          error,
          row,
        });
        rowErrors.push(
          `${row.originalDescription}: ${normalizeError(error).message}`,
        );
      }
    }

    const createdTransactions =
      preparedRows.length > 0
        ? await this.transactionService.bulkCreateForImport(
            userId,
            preparedRows.map((preparedRow) => preparedRow.data),
          )
        : [];

    await this.confirmRecurringSubscriptions(userId, preparedRows, rowErrors);
    await this.scanForLeaks(userId, importId, rowErrors);

    const successCount = createdTransactions.length;
    const hasOnlyFailedRows = rows.length > 0 && successCount === 0;
    const errorMessage = rowErrors.length
      ? rowErrors.slice(0, 50).join('\n').slice(0, DATA_LENGTHS.DESCRIPTION)
      : undefined;

    await this.updateStatus(importId, userId, {
      status: hasOnlyFailedRows
        ? TImportStatus.FAILED
        : TImportStatus.COMPLETED,
      transactionCount: successCount,
      errorMessage,
    });
  }

  // A scan failure is reported alongside the import instead of failing it outright: the
  // transactions themselves were still ingested successfully.
  private async scanForLeaks(
    userId: string,
    importId: string,
    rowErrors: string[],
  ): Promise<void> {
    try {
      await this.leakResponseService.scanAndRespond(userId, importId);
    } catch (error) {
      this.logger.error({
        message: 'Failed to scan for financial leaks after import',
        error,
      });
      rowErrors.push(`Leak detection failed: ${normalizeError(error).message}`);
    }
  }

  // Under waitUntil there is no HTTP caller left to see a thrown error, so without this the
  // import would stay stuck at PROCESSING forever with no way for the client to find out.
  private async failImport(
    id: string,
    userId: string,
    error: unknown,
  ): Promise<void> {
    this.logger.error({ message: 'Statement import pipeline crashed', error });

    try {
      await this.updateStatus(id, userId, {
        status: TImportStatus.FAILED,
        errorMessage: normalizeError(error).message.slice(
          0,
          DATA_LENGTHS.DESCRIPTION,
        ),
      });
    } catch (updateError) {
      this.logger.error({
        message: 'Failed to mark crashed import as FAILED',
        error: updateError,
      });
    }
  }

  // Resolves every row's vendor up front in two passes instead of once per row: an exact-match
  // batch lookup against known aliases, then a single batched AI call for whatever is left.
  private async resolveVendorsForRows(
    rows: IParsedTransactionRow[],
  ): Promise<Map<string, Vendor>> {
    const descriptions = rows.map((row) => row.originalDescription);
    const vendorIdByPattern =
      await this.vendorAliasService.resolveVendorIdsBatch(descriptions);

    const vendorByPattern = new Map<string, Vendor>();
    const unresolvedByPattern = new Map<string, string>();

    for (const description of descriptions) {
      const pattern = this.vendorAliasService.normalizePattern(description);

      if (vendorByPattern.has(pattern) || unresolvedByPattern.has(pattern)) {
        continue;
      }

      const vendorId = vendorIdByPattern.get(pattern);

      if (vendorId == null) {
        unresolvedByPattern.set(pattern, description);
        continue;
      }

      vendorByPattern.set(
        pattern,
        await this.resolveExistingVendor(vendorId, description),
      );
    }

    await this.classifyUnresolvedVendors(unresolvedByPattern, vendorByPattern);

    return vendorByPattern;
  }

  private async resolveExistingVendor(
    vendorId: string,
    originalDescription: string,
  ): Promise<Vendor> {
    const vendor = await this.vendorService.getById(vendorId);

    if (vendor.isLikelySubscription != null) {
      return vendor;
    }

    // An older or admin-created vendor can be left with an unresolved classification; retry it
    // here so the vendor can self-heal instead of staying stuck undetectable forever.
    return this.resolveMissingLikelySubscription(vendor, originalDescription);
  }

  private async classifyUnresolvedVendors(
    unresolvedByPattern: Map<string, string>,
    vendorByPattern: Map<string, Vendor>,
  ): Promise<void> {
    if (unresolvedByPattern.size === 0) {
      return;
    }

    const entries = [...unresolvedByPattern.entries()];
    const classifications = await this.vendorClassifierService.classifyBatch(
      entries.map(([, description]) => description),
    );

    for (const [index, [pattern, description]] of entries.entries()) {
      const classification = classifications[index];

      if (classification == null) {
        continue;
      }

      vendorByPattern.set(
        pattern,
        await this.createVendorFromClassification(description, classification),
      );
    }
  }

  private async createVendorFromClassification(
    originalDescription: string,
    classification: IVendorClassification,
  ): Promise<Vendor> {
    const transaction = await this.sequelize.transaction();

    try {
      const vendor = await this.vendorService.findOrCreateByName(
        classification.vendorName,
        {
          category: classification.category,
          serviceType: classification.serviceType,
          billingCycle: classification.billingCycle,
          cancellationEmail: classification.cancellationEmail,
          averageMarketPrice: classification.estimatedAveragePrice,
          isLikelySubscription: classification.isLikelySubscription,
        },
        transaction,
      );

      await this.vendorAliasService.createIdempotent(
        originalDescription,
        vendor.id,
        transaction,
      );

      await transaction.commit();

      return vendor;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }

  private async formatRow(
    userId: string,
    importId: string,
    row: IParsedTransactionRow,
    vendorByPattern: Map<string, Vendor>,
    dedupeState: IRowDedupeState,
  ): Promise<IPreparedTransactionRow | null> {
    const isExternalIdDuplicate =
      row.externalId != null &&
      (dedupeState.existingExternalIds.has(row.externalId) ||
        dedupeState.seenExternalIds.has(row.externalId));

    if (isExternalIdDuplicate) {
      return null;
    }

    const rowKey = `${row.transactionDate}|${row.amount}`;
    const isDuplicate =
      dedupeState.seenKeys.has(rowKey) ||
      (await this.transactionService.isDuplicate(
        userId,
        row.transactionDate,
        row.amount,
      ));

    if (isDuplicate) {
      return null;
    }

    const pattern = this.vendorAliasService.normalizePattern(
      row.originalDescription,
    );
    const vendor = vendorByPattern.get(pattern) ?? null;
    const subscriptionId =
      vendor != null
        ? await this.resolveSubscriptionForRow(userId, vendor, row)
        : null;

    dedupeState.seenKeys.add(rowKey);

    if (row.externalId != null) {
      dedupeState.seenExternalIds.add(row.externalId);
    }

    return {
      vendor,
      data: { ...row, importId, subscriptionId, vendorId: vendor?.id ?? null },
    };
  }

  private async resolveSubscriptionForRow(
    userId: string,
    vendor: Vendor,
    row: IParsedTransactionRow,
  ): Promise<string | null> {
    const existingSubscription =
      await this.subscriptionService.findFirstActiveByVendor(userId, vendor.id);

    if (existingSubscription != null) {
      return existingSubscription.id;
    }

    if (!vendor.isLikelySubscription) {
      return null;
    }

    const transaction = await this.sequelize.transaction();

    try {
      const subscription = await this.subscriptionService.findOrCreateForImport(
        userId,
        vendor.id,
        row.amount,
        row.currency,
        vendor.billingCycle,
        transaction,
      );

      await transaction.commit();

      return subscription.id;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }

  // Runs after the rows are inserted so charges from this same statement count as evidence;
  // the AI's single-description guess can miss a subscription the user's history proves.
  private async confirmRecurringSubscriptions(
    userId: string,
    preparedRows: IPreparedTransactionRow[],
    rowErrors: string[],
  ): Promise<void> {
    for (const vendor of this.collectRecurrenceCandidates(preparedRows)) {
      try {
        await this.confirmRecurringSubscription(userId, vendor);
      } catch (error) {
        this.logger.error({
          message: 'Failed to confirm recurring subscription',
          error,
          vendorId: vendor.id,
        });
        rowErrors.push(
          `Recurrence detection failed for ${vendor.name}: ${normalizeError(error).message}`,
        );
      }
    }
  }

  private collectRecurrenceCandidates(
    preparedRows: IPreparedTransactionRow[],
  ): Vendor[] {
    const candidateByVendorId = new Map<string, Vendor>();

    for (const { vendor, data } of preparedRows) {
      const isUnassigned = vendor != null && data.subscriptionId == null;
      const isSubscriptionCategory =
        vendor?.category == null ||
        !NON_SUBSCRIPTION_CATEGORIES.includes(vendor.category);

      if (isUnassigned && isSubscriptionCategory) {
        candidateByVendorId.set(vendor.id, vendor);
      }
    }

    return [...candidateByVendorId.values()];
  }

  private async confirmRecurringSubscription(
    userId: string,
    vendor: Vendor,
  ): Promise<void> {
    const recurrence = await this.transactionService.detectRecurrenceForVendor(
      userId,
      vendor.id,
    );

    if (recurrence == null) {
      return;
    }

    const transaction = await this.sequelize.transaction();

    try {
      const subscription = await this.subscriptionService.findOrCreateForImport(
        userId,
        vendor.id,
        recurrence.amount,
        recurrence.currency,
        recurrence.billingCycle,
        transaction,
      );

      await this.transactionService.linkUnassignedVendorCharges(
        userId,
        vendor.id,
        subscription.id,
        transaction,
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }

  private async resolveMissingLikelySubscription(
    vendor: Vendor,
    originalDescription: string,
  ): Promise<Vendor> {
    const classification =
      await this.vendorClassifierService.classify(originalDescription);

    if (classification == null) {
      return vendor;
    }

    return this.vendorService.findOrCreateByName(vendor.name, {
      category: classification.category,
      serviceType: classification.serviceType,
      billingCycle: classification.billingCycle,
      cancellationEmail: classification.cancellationEmail,
      averageMarketPrice: classification.estimatedAveragePrice,
      isLikelySubscription: classification.isLikelySubscription,
    });
  }

  public async updateStatus(
    id: string,
    userId: string,
    data: UpdateImportStatusDto,
  ): Promise<StatementImport> {
    const statementImport = await this.getById(id, userId);

    if (TERMINAL_IMPORT_STATUSES.includes(statementImport.status)) {
      throw new BadRequestException('Import already reached a final status');
    }

    const statusPatch = IMPORT_STATUS_PATCH_BY_STATUS[data.status](data);

    await this.statementImportRepository.update(id, {
      ...statusPatch,
      status: data.status,
    });

    return this.getById(id, userId);
  }

  public async undo(id: string, userId: string): Promise<StatementImport> {
    const statementImport = await this.getById(id, userId);

    if (statementImport.status === TImportStatus.PROCESSING) {
      throw new BadRequestException('Import is still processing');
    }

    const transaction = await this.sequelize.transaction();

    try {
      await this.transactionService.deleteByImport(
        userId,
        statementImport.id,
        transaction,
      );

      await this.statementImportRepository.update(
        id,
        { transactionCount: 0 },
        transaction,
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error({ message: 'Failed to undo statement import', error });

      throw error;
    }

    return this.getById(id, userId);
  }
}
