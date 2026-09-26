import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  TImportStatus,
  TERMINAL_IMPORT_STATUSES,
} from './constants/import-status.constant';

import {
  IBankImportRequest,
  IImportStatusUpdate,
  IImportTransactionRow,
} from './interfaces/statement-import.interface';

import {
  pickLatestCharge,
  toRecurringCharge,
  getRequiredChargeCount,
} from './utilities/recurrence-candidate.utility';

import {
  IRecurrence,
  IRecurringCharge,
} from '@Modules/transaction/interfaces/recurrence.interface';

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
import { normalizeError } from '../../utilities/normalize-error.utility';
import { GetStatementImportsDto } from './dto/get-statement-imports.dto';
import { toVendorNameEntry } from './utilities/vendor-name-entry.utility';
import { StatementImportRepository } from './statement-import.repository';
import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { VendorAliasService } from '@Modules/vendor-alias/vendor-alias.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { IMPORT_STATUS_PATCH_BY_STATUS } from './constants/status-patch.constant';
import { buildDedupeKey } from '@Modules/transaction/utilities/dedupe-key.utility';
import { LeakResponseService } from '@Modules/leak-response/leak-response.service';
import { DEFAULT_BILLING_CYCLE } from '@Modules/subscription/constants/billing-cycle.constant';
import { VendorClassifierService } from '@Modules/vendor-classifier/vendor-classifier.service';
import { TCreateTransactionForImport } from '@Modules/transaction/interfaces/transaction.interface';
import { isSubscriptionCandidate } from '@Modules/vendor/utilities/subscription-eligibility.utility';
import { hasStandingOrderMarker } from '@Modules/vendor-classifier/utilities/standing-order.utility';
import { CancellationContactService } from '@Modules/cancellation-contact/cancellation-contact.service';

interface IRowDedupeState {
  seenKeys: Set<string>;
  existingKeys: Set<string>;
  seenExternalIds: Set<string>;
  existingExternalIds: Set<string>;
}

interface IPreparedTransactionRow {
  vendor: Vendor | null;
  data: TCreateTransactionForImport;
}

interface IPendingClassification {
  pattern: string;
  description: string;
  knownVendor: Vendor | null;
}

// Aliased rather than inlined: a comma inside an interface member's generic confuses the
// pyramid-interface-keys formatter plugin.
type TVendorByPattern = Map<string, Vendor>;
type TSubscriptionIdByVendorId = Map<string, string>;

interface IRowLookups {
  vendorByPattern: TVendorByPattern;
  subscriptionIdByVendorId: TSubscriptionIdByVendorId;
}

interface IRecurrenceCandidate {
  vendor: Vendor;
  description: string;
  standingOrderCharge: IRecurringCharge | null;
}

interface IConfirmedRecurrence {
  recurrence: IRecurrence;
  candidate: IRecurrenceCandidate;
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
    private readonly cancellationContactService: CancellationContactService,
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

  // Returns as soon as the import is recorded, already PROCESSING; classification, insertion,
  // and leak detection continue in the background via waitUntil (see failImport for why a crash
  // there still has to reach the row instead of vanishing).
  public async startBankImport(
    userId: string,
    data: IBankImportRequest,
  ): Promise<StatementImport> {
    const statementImport = await this.statementImportRepository.create({
      userId,
      source: TImportSource.BANK_API,
      status: TImportStatus.PROCESSING,
      bankConnectionId: data.bankConnectionId,
    });

    waitUntil(
      this.runImportPipeline(
        userId,
        statementImport.id,
        data.rows,
        data.rowErrors,
      ).catch((error) => this.failImport(statementImport.id, userId, error)),
    );

    return statementImport;
  }

  private async runImportPipeline(
    userId: string,
    importId: string,
    rows: IImportTransactionRow[],
    importErrors: string[],
  ): Promise<void> {
    const rowErrors = [...importErrors];

    // Vendor resolution waits on the AI classifier; loading the dedupe keys does not depend on
    // it, so the two run side by side instead of back to back.
    const [vendorByPattern, dedupeState] = await Promise.all([
      this.resolveVendorsForRows(rows),
      this.loadDedupeState(userId, rows),
    ]);
    const subscriptionIdByVendorId =
      await this.subscriptionService.getActiveIdsByVendor(userId, [
        ...new Set([...vendorByPattern.values()].map((vendor) => vendor.id)),
      ]);

    const preparedRows = rows.flatMap((row) => {
      const preparedRow = this.formatRow(importId, row, dedupeState, {
        vendorByPattern,
        subscriptionIdByVendorId,
      });

      return preparedRow === null ? [] : [preparedRow];
    });

    const createdTransactions =
      preparedRows.length > 0
        ? await this.transactionService.bulkCreateForImport(
            userId,
            preparedRows.map((preparedRow) => preparedRow.data),
          )
        : [];

    await this.confirmRecurringSubscriptions(userId, preparedRows, rowErrors);

    const successCount = createdTransactions.length;
    const hasOnlyFailedRows = rows.length > 0 && successCount === 0;
    const errorMessage = rowErrors.length
      ? rowErrors.slice(0, 50).join('\n').slice(0, DATA_LENGTHS.DESCRIPTION)
      : null;

    await this.updateStatus(importId, userId, {
      status: hasOnlyFailedRows
        ? TImportStatus.FAILED
        : TImportStatus.COMPLETED,
      transactionCount: successCount,
      errorMessage,
    });

    await this.enrichAfterImport(userId, importId);
  }

  // The user's transactions and subscriptions are already visible once the import completes;
  // the slow web lookups and the leak scan finish afterwards. Contacts run first so the
  // cancellation drafts the scan produces can already address the vendor.
  private async enrichAfterImport(
    userId: string,
    importId: string,
  ): Promise<void> {
    await this.resolveCancellationContacts(userId);
    await this.scanForLeaks(userId, importId);
  }

  private async loadDedupeState(
    userId: string,
    rows: IImportTransactionRow[],
  ): Promise<IRowDedupeState> {
    const externalIds = rows
      .map((row) => row.externalId)
      .filter((externalId): externalId is string => externalId != null);

    const [existingExternalIds, existingKeys] = await Promise.all([
      this.transactionService.findExistingExternalIds(userId, externalIds),
      this.transactionService.getExistingDedupeKeys(
        userId,
        rows.map((row) => row.transactionDate),
      ),
    ]);

    return {
      existingKeys,
      existingExternalIds,
      seenKeys: new Set(),
      seenExternalIds: new Set(),
    };
  }

  // Enrichment runs after the import already completed, so a failure is only logged: the
  // transactions were ingested, and the next import retries whatever did not finish.
  private async resolveCancellationContacts(userId: string): Promise<void> {
    try {
      await this.cancellationContactService.resolveForUser(userId);
    } catch (error) {
      this.logger.error({
        message: 'Failed to resolve cancellation contacts after import',
        error,
      });
    }
  }

  private async scanForLeaks(userId: string, importId: string): Promise<void> {
    try {
      await this.leakResponseService.scanAndRespond(userId, importId);
    } catch (error) {
      this.logger.error({
        message: 'Failed to scan for financial leaks after import',
        error,
      });
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

  // Resolves every row's vendor up front: one alias lookup and one vendor read for what is
  // already known, then a single classifier batch and a single transaction that bulk-creates
  // the new vendors and their aliases.
  private async resolveVendorsForRows(
    rows: IImportTransactionRow[],
  ): Promise<Map<string, Vendor>> {
    const descriptionByPattern = new Map(
      rows
        .map((row) => row.originalDescription)
        .reverse()
        .map((description) => [
          this.vendorAliasService.normalizePattern(description),
          description,
        ]),
    );
    const vendorIdByPattern =
      await this.vendorAliasService.resolveVendorIdsBatch([
        ...descriptionByPattern.values(),
      ]);
    const knownVendors = await this.vendorService.getByIds([
      ...new Set(vendorIdByPattern.values()),
    ]);
    const knownVendorById = new Map(
      knownVendors.map((vendor) => [vendor.id, vendor]),
    );

    const vendorByPattern = new Map<string, Vendor>();
    const pendingClassifications: IPendingClassification[] = [];

    for (const [pattern, description] of descriptionByPattern) {
      const vendorId = vendorIdByPattern.get(pattern) ?? null;
      const knownVendor =
        vendorId === null ? null : (knownVendorById.get(vendorId) ?? null);

      if (knownVendor !== null) {
        vendorByPattern.set(pattern, knownVendor);
      }

      // An older or admin-created vendor can be left unclassified; it is classified again here
      // so it can self-heal instead of staying undetectable forever.
      if (knownVendor?.chargeKind == null) {
        pendingClassifications.push({ pattern, description, knownVendor });
      }
    }

    const classifiedVendors = await this.classifyAndStoreVendors(
      pendingClassifications,
    );

    return new Map([...vendorByPattern, ...classifiedVendors]);
  }

  private async classifyAndStoreVendors(
    pending: IPendingClassification[],
  ): Promise<Map<string, Vendor>> {
    if (pending.length === 0) {
      return new Map();
    }

    const classifications = await this.vendorClassifierService.classifyBatch(
      pending.map((item) => item.description),
    );
    const classified = pending.flatMap((item, index) => {
      const classification = classifications[index] ?? null;

      return classification === null ? [] : [{ ...item, classification }];
    });

    const transaction = await this.sequelize.transaction();

    try {
      const vendorByName = await this.vendorService.findOrCreateManyByName(
        classified.map(toVendorNameEntry),
        transaction,
      );
      const resolved = classified.flatMap((item) => {
        const vendor = vendorByName.get(toVendorNameEntry(item).name) ?? null;

        return vendor === null ? [] : [{ ...item, vendor }];
      });

      await this.vendorAliasService.createManyIdempotent(
        resolved.map((item) => ({
          vendorId: item.vendor.id,
          description: item.description,
        })),
        transaction,
      );

      await transaction.commit();

      return new Map(resolved.map((item) => [item.pattern, item.vendor]));
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }

  private formatRow(
    importId: string,
    row: IImportTransactionRow,
    dedupeState: IRowDedupeState,
    lookups: IRowLookups,
  ): IPreparedTransactionRow | null {
    const isExternalIdDuplicate =
      row.externalId != null &&
      (dedupeState.existingExternalIds.has(row.externalId) ||
        dedupeState.seenExternalIds.has(row.externalId));

    if (isExternalIdDuplicate) {
      return null;
    }

    const rowKey = buildDedupeKey(row.transactionDate, row.amount);
    const isDuplicate =
      dedupeState.seenKeys.has(rowKey) || dedupeState.existingKeys.has(rowKey);

    if (isDuplicate) {
      return null;
    }

    const pattern = this.vendorAliasService.normalizePattern(
      row.originalDescription,
    );
    const vendor = lookups.vendorByPattern.get(pattern) ?? null;
    const subscriptionId =
      vendor === null
        ? null
        : (lookups.subscriptionIdByVendorId.get(vendor.id) ?? null);

    dedupeState.seenKeys.add(rowKey);

    if (row.externalId != null) {
      dedupeState.seenExternalIds.add(row.externalId);
    }

    return {
      vendor,
      data: { ...row, importId, subscriptionId, vendorId: vendor?.id ?? null },
    };
  }

  // Runs after the rows are inserted so charges from this same statement count as evidence. The
  // AI's single-description guess only lowers how much evidence is needed, it never replaces it.
  private async confirmRecurringSubscriptions(
    userId: string,
    preparedRows: IPreparedTransactionRow[],
    rowErrors: string[],
  ): Promise<void> {
    const candidates = this.collectRecurrenceCandidates(preparedRows);
    const recurrenceByVendorId = await this.resolveRecurrences(
      userId,
      candidates,
    );
    const confirmedRecurrences: IConfirmedRecurrence[] = [];

    for (const candidate of candidates) {
      const recurrence = recurrenceByVendorId.get(candidate.vendor.id) ?? null;

      if (recurrence === null) {
        continue;
      }

      try {
        await this.createSubscriptionFromRecurrence(
          userId,
          candidate,
          recurrence,
        );
        confirmedRecurrences.push({ candidate, recurrence });
      } catch (error) {
        this.logger.error({
          message: 'Failed to confirm recurring subscription',
          error,
          vendorId: candidate.vendor.id,
        });
        rowErrors.push(
          `Recurrence detection failed for ${candidate.vendor.name}: ${normalizeError(error).message}`,
        );
      }
    }

    await this.promoteMisclassifiedVendors(confirmedRecurrences);
  }

  // History just proved these vendors recur although the classifier guessed otherwise; left as
  // they are, their generic NONE service type would keep them out of duplicate detection forever.
  // The subscriptions already exist, so a failure here is only logged.
  private async promoteMisclassifiedVendors(
    confirmedRecurrences: IConfirmedRecurrence[],
  ): Promise<void> {
    const misclassified = confirmedRecurrences.filter(
      ({ candidate }) =>
        candidate.vendor.chargeKind !== TChargeKind.SUBSCRIPTION,
    );

    if (misclassified.length === 0) {
      return;
    }

    try {
      const classifications =
        await this.vendorClassifierService.classifyConfirmedSubscriptions(
          misclassified.map(({ candidate }) => candidate.description),
        );

      await Promise.all(
        misclassified.map(({ candidate, recurrence }, index) =>
          this.vendorService.promoteToSubscription(candidate.vendor, {
            billingCycle: recurrence.billingCycle,
            serviceType: classifications[index]?.serviceType ?? null,
          }),
        ),
      );
    } catch (error) {
      this.logger.error({
        message: 'Failed to promote vendors confirmed as subscriptions',
        error,
      });
    }
  }

  // A standing order is the bank's own statement that the charge repeats, so it is the one signal
  // strong enough to confirm a subscription from a single charge; every other candidate's
  // history is checked in one batched query.
  private async resolveRecurrences(
    userId: string,
    candidates: IRecurrenceCandidate[],
  ): Promise<Map<string, IRecurrence | null>> {
    const historyCandidates = candidates.filter(
      (candidate) => candidate.standingOrderCharge === null,
    );
    const detectedByVendorId =
      await this.transactionService.detectRecurrenceForVendors(
        userId,
        historyCandidates.map((candidate) => ({
          vendorId: candidate.vendor.id,
          requiredCharges: getRequiredChargeCount(candidate.vendor),
        })),
      );
    const standingOrderRecurrences = candidates.flatMap((candidate) =>
      candidate.standingOrderCharge === null
        ? []
        : [
            [
              candidate.vendor.id,
              {
                amount: candidate.standingOrderCharge.amount,
                currency: candidate.standingOrderCharge.currency,
                billingCycle:
                  candidate.vendor.billingCycle ?? DEFAULT_BILLING_CYCLE,
              },
            ] as const,
          ],
    );

    return new Map([...detectedByVendorId, ...standingOrderRecurrences]);
  }

  private collectRecurrenceCandidates(
    preparedRows: IPreparedTransactionRow[],
  ): IRecurrenceCandidate[] {
    const candidateByVendorId = new Map<string, IRecurrenceCandidate>();

    for (const { vendor, data } of preparedRows) {
      const isUnassigned = vendor != null && data.subscriptionId == null;

      if (!isUnassigned || !isSubscriptionCandidate(vendor)) {
        continue;
      }

      const candidate = candidateByVendorId.get(vendor.id) ?? {
        vendor,
        standingOrderCharge: null,
        description: data.originalDescription,
      };
      const isStandingOrder = hasStandingOrderMarker(data.originalDescription);

      candidateByVendorId.set(vendor.id, {
        vendor,
        description: candidate.description,
        standingOrderCharge: isStandingOrder
          ? pickLatestCharge(
              candidate.standingOrderCharge,
              toRecurringCharge(data),
            )
          : candidate.standingOrderCharge,
      });
    }

    return [...candidateByVendorId.values()];
  }

  private async createSubscriptionFromRecurrence(
    userId: string,
    candidate: IRecurrenceCandidate,
    recurrence: IRecurrence,
  ): Promise<void> {
    const transaction = await this.sequelize.transaction();

    try {
      const subscription = await this.subscriptionService.findOrCreateForImport(
        userId,
        candidate.vendor.id,
        recurrence.amount,
        recurrence.currency,
        recurrence.billingCycle,
        transaction,
      );

      await this.transactionService.linkUnassignedVendorCharges(
        userId,
        candidate.vendor.id,
        subscription.id,
        transaction,
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }

  private async updateStatus(
    id: string,
    userId: string,
    data: IImportStatusUpdate,
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
