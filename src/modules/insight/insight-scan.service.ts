import {
  buildDuplicateInsightBody,
  buildOverpayingInsightBody,
  buildLargePurchaseInsightBody,
  buildRedundantServiceInsightBody,
  buildVendorSpendingSpikeInsightBody,
} from './constants/insight-body.constant';

import { Injectable } from '@nestjs/common';
import { UniqueConstraintError } from 'sequelize';
import { Insight } from './entities/insight.entity';
import { InsightRepository } from './insight.repository';
import { TypedLogger } from '../../logger/logger.service';
import { TCreateInsight } from './interfaces/insight.interface';
import { TInsightType } from './constants/insight-type.constant';
import { InsightScanRepository } from './insight-scan.repository';
import { IDuplicateLeakGroup } from './interfaces/insight-scan.interface';
import { SERVICE_TYPE_LABELS } from '@Modules/vendor/constants/service-type.constant';

@Injectable()
export class InsightScanService {
  private readonly logger = new TypedLogger('InsightScanService');

  constructor(
    private readonly insightRepository: InsightRepository,
    private readonly insightScanRepository: InsightScanRepository,
  ) {}

  // Runs every SQL detection query for the user and returns only the insights that were
  // actually newly created (a repeat detection idempotently no-ops on an existing UNREAD one).
  public async scanForUser(
    userId: string,
    importId: string,
  ): Promise<Insight[]> {
    const [overpaying, duplicates, spikes, largePurchases] = await Promise.all([
      this.scanOverpaying(userId),
      this.scanDuplicates(userId),
      this.scanSpendingSpikes(userId, importId),
      this.scanLargePurchases(userId, importId),
    ]);

    return [...overpaying, ...duplicates, ...spikes, ...largePurchases];
  }

  private async scanOverpaying(userId: string): Promise<Insight[]> {
    const rows = await this.insightScanRepository.findOverpayingLeaks(userId);

    return this.createInsightsIdempotent(
      rows.map((row) => ({
        userId,
        type: TInsightType.OVERPAYING,
        subscriptionId: row.subscriptionId,
        body: buildOverpayingInsightBody(
          row.vendorName,
          row.amount,
          row.averageMarketPrice,
        ),
        estimatedMonthlySavings: (
          Number(row.amount) - Number(row.averageMarketPrice)
        ).toFixed(2),
        metadata: {
          vendorId: row.vendorId,
          vendorName: row.vendorName,
          amount: row.amount,
          averageMarketPrice: row.averageMarketPrice,
        },
      })),
    );
  }

  private async scanDuplicates(userId: string): Promise<Insight[]> {
    const groups =
      await this.insightScanRepository.findDuplicateSubscriptionGroups(userId);

    return this.createInsightsIdempotent(
      groups.map((group) => ({
        userId,
        type: TInsightType.DUPLICATE,
        subscriptionId: group.anchorSubscriptionId,
        body: this.buildDuplicateBody(group),
        estimatedMonthlySavings: group.anchorAmount,
        metadata: {
          serviceType: group.serviceType,
          vendorNames: group.vendorNames,
          subscriptionIds: group.subscriptionIds,
        },
      })),
    );
  }

  private buildDuplicateBody(group: IDuplicateLeakGroup): string {
    const isSameVendorTwice = group.vendorNames.length === 1;

    if (isSameVendorTwice) {
      return buildDuplicateInsightBody(group.vendorNames[0]);
    }

    return buildRedundantServiceInsightBody(
      SERVICE_TYPE_LABELS[group.serviceType],
      group.vendorNames,
    );
  }

  private async scanSpendingSpikes(
    userId: string,
    importId: string,
  ): Promise<Insight[]> {
    const rows = await this.insightScanRepository.findVendorSpendingSpikes(
      userId,
      importId,
    );

    return this.createInsightsIdempotent(
      rows.map((row) => ({
        userId,
        type: TInsightType.HIGH_SPENDING,
        transactionId: row.transactionId,
        body: buildVendorSpendingSpikeInsightBody(
          row.vendorName,
          row.amount,
          row.vendorAverage,
        ),
        estimatedMonthlySavings: null,
        metadata: {
          vendorId: row.vendorId,
          vendorName: row.vendorName,
          amount: row.amount,
          vendorAverage: row.vendorAverage,
        },
      })),
    );
  }

  private async scanLargePurchases(
    userId: string,
    importId: string,
  ): Promise<Insight[]> {
    const rows = await this.insightScanRepository.findLargeOneOffPurchases(
      userId,
      importId,
    );

    return this.createInsightsIdempotent(
      rows.map((row) => ({
        userId,
        type: TInsightType.HIGH_SPENDING,
        transactionId: row.transactionId,
        body: buildLargePurchaseInsightBody(row.vendorName, row.amount),
        estimatedMonthlySavings: null,
        metadata: {
          amount: row.amount,
          vendorName: row.vendorName,
          userAverage: row.userAverage,
        },
      })),
    );
  }

  private async createInsightsIdempotent(
    candidates: TCreateInsight[],
  ): Promise<Insight[]> {
    const insights = await Promise.all(
      candidates.map((candidate) => this.createInsightIdempotent(candidate)),
    );

    return insights.filter((insight): insight is Insight => insight != null);
  }

  private async createInsightIdempotent(
    data: TCreateInsight,
  ): Promise<Insight | null> {
    try {
      return await this.insightRepository.create(data);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return null;
      }

      this.logger.error({
        message: 'Failed to create insight from scan',
        error,
      });

      throw error;
    }
  }
}
