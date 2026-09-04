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
import { DATA_LENGTHS } from '@Constants/data-length';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { VendorService } from '@Modules/vendor/vendor.service';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { InsightService } from '@Modules/insight/insight.service';
import { TImportSource } from './constants/import-source.constant';
import { ProviderNames } from '@Providers/database/provider-names';
import { StatementImport } from './entities/statement-import.entity';
import { UpdateImportStatusDto } from './dto/update-import-status.dto';
import { normalizeError } from '../../utilities/normalize-error.utility';
import { GetStatementImportsDto } from './dto/get-statement-imports.dto';
import { StatementImportRepository } from './statement-import.repository';
import { CreateStatementImportDto } from './dto/create-statement-import.dto';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { Transaction } from '@Modules/transaction/entities/transaction.entity';
import { VendorAliasService } from '@Modules/vendor-alias/vendor-alias.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { IMPORT_STATUS_PATCH_BY_STATUS } from './constants/status-patch.constant';
import { ISpendingBaseline } from '@Modules/transaction/utilities/spending-baseline.utility';
import { VendorClassifierService } from '@Modules/vendor-classifier/vendor-classifier.service';
import { TCreateTransactionForImport } from '@Modules/transaction/interfaces/transaction.interface';

interface IRowDedupeState {
  seenKeys: Set<string>;
  seenExternalIds: Set<string>;
  existingExternalIds: Set<string>;
}

interface IPreparedTransactionRow {
  vendor: Vendor | null;
  data: TCreateTransactionForImport;
  userBaseline: ISpendingBaseline | null;
  vendorBaseline: ISpendingBaseline | null;
}

@Injectable()
export class StatementImportService {
  private readonly logger = new TypedLogger('StatementImportService');

  constructor(
    @Inject(ProviderNames.SEQUELIZE)
    private readonly sequelize: Sequelize,
    private readonly vendorService: VendorService,
    private readonly insightService: InsightService,
    private readonly transactionService: TransactionService,
    private readonly vendorAliasService: VendorAliasService,
    private readonly subscriptionService: SubscriptionService,
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

  public async processUpload(
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

    await this.updateStatus(statementImport.id, userId, {
      status: TImportStatus.PROCESSING,
    });

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
    const preparedRows: IPreparedTransactionRow[] = [];

    for (const row of rows) {
      try {
        const preparedRow = await this.formatRow(
          userId,
          statementImport.id,
          row,
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

    const insightResults = await Promise.allSettled(
      createdTransactions.map((transactionRecord, index) =>
        this.generateInsightsForRow(
          userId,
          transactionRecord,
          preparedRows[index],
        ),
      ),
    );

    for (const insightResult of insightResults) {
      if (insightResult.status === 'rejected') {
        this.logger.error({
          message: 'Failed to generate insight for imported transaction',
          error: insightResult.reason,
        });
        rowErrors.push(
          `Insight generation failed: ${normalizeError(insightResult.reason).message}`,
        );
      }
    }

    const successCount = createdTransactions.length;
    const hasOnlyFailedRows = rows.length > 0 && successCount === 0;
    const errorMessage = rowErrors.length
      ? rowErrors.slice(0, 50).join('\n').slice(0, DATA_LENGTHS.DESCRIPTION)
      : undefined;

    return this.updateStatus(statementImport.id, userId, {
      status: hasOnlyFailedRows
        ? TImportStatus.FAILED
        : TImportStatus.COMPLETED,
      transactionCount: successCount,
      errorMessage,
    });
  }

  private async formatRow(
    userId: string,
    importId: string,
    row: IParsedTransactionRow,
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

    let vendor: Vendor | null = null;
    let vendorId = await this.vendorAliasService.resolveVendorId(
      row.originalDescription,
    );
    let subscriptionId: string | null = null;

    if (vendorId == null) {
      const classification = await this.vendorClassifierService.classify(
        row.originalDescription,
      );

      if (classification != null) {
        const transaction = await this.sequelize.transaction();

        try {
          vendor = await this.vendorService.findOrCreateByName(
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

          vendorId = await this.vendorAliasService.createIdempotent(
            row.originalDescription,
            vendor.id,
            transaction,
          );

          await transaction.commit();
        } catch (error) {
          await transaction.rollback();

          throw error;
        }
      }
    } else {
      vendor = await this.vendorService.getById(vendorId);

      if (vendor.isLikelySubscription == null) {
        // An older or admin-created vendor can be left with an unresolved classification; retry it
        // here so the vendor can self-heal instead of staying stuck undetectable forever.
        vendor = await this.resolveMissingLikelySubscription(
          vendor,
          row.originalDescription,
        );
      }

      const existingSubscription =
        await this.subscriptionService.findFirstActiveByVendor(
          userId,
          vendorId,
        );

      if (existingSubscription != null) {
        subscriptionId = existingSubscription.id;

        await this.insightService.generateForSubscription(
          userId,
          existingSubscription,
          vendor,
        );
      } else if (vendor.isLikelySubscription) {
        // A second real charge from a vendor the AI flagged as subscription-like confirms the
        // recurrence, so the subscription is only created now rather than off a single guess.
        const transaction = await this.sequelize.transaction();

        try {
          const subscription =
            await this.subscriptionService.findOrCreateForImport(
              userId,
              vendorId,
              row.amount,
              row.currency,
              vendor.billingCycle,
              transaction,
            );

          subscriptionId = subscription.id;

          await this.insightService.generateForSubscription(
            userId,
            subscription,
            vendor,
            transaction,
          );

          await transaction.commit();
        } catch (error) {
          await transaction.rollback();

          throw error;
        }
      }
    }

    let vendorBaseline: ISpendingBaseline | null = null;
    let userBaseline: ISpendingBaseline | null = null;

    if (vendorId != null) {
      vendorBaseline = await this.transactionService.getAverageAmountForVendor(
        userId,
        vendorId,
      );
      userBaseline =
        await this.transactionService.getAverageAmountForUser(userId);
    }

    dedupeState.seenKeys.add(rowKey);

    if (row.externalId != null) {
      dedupeState.seenExternalIds.add(row.externalId);
    }

    return {
      vendor,
      userBaseline,
      vendorBaseline,
      data: { ...row, vendorId, importId, subscriptionId },
    };
  }

  private async generateInsightsForRow(
    userId: string,
    transactionRecord: Transaction,
    preparedRow: IPreparedTransactionRow,
  ): Promise<void> {
    if (
      preparedRow.vendor == null ||
      preparedRow.userBaseline == null ||
      preparedRow.vendorBaseline == null
    ) {
      return;
    }

    await this.insightService.generateForTransaction(
      userId,
      transactionRecord,
      preparedRow.vendor,
      preparedRow.vendorBaseline,
      preparedRow.userBaseline,
    );
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
