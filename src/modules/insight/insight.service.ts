import {
  UniqueConstraintError,
  Transaction as SequelizeTransaction,
} from 'sequelize';

import {
  buildDuplicateInsightBody,
  buildOverpayingInsightBody,
  buildLargePurchaseInsightBody,
  buildRedundantServiceInsightBody,
  buildVendorSpendingSpikeInsightBody,
} from './constants/insight-body.constant';

import {
  isVendorSpendingSpike,
  isLargeOneOffPurchase,
} from './utilities/high-spending-detection.utility';

import {
  isRedundantServiceType,
  buildRedundantServiceGroup,
} from './utilities/redundant-service-detection.utility';

import {
  TServiceType,
  SERVICE_TYPE_LABELS,
} from '@Modules/vendor/constants/service-type.constant';

import { Insight } from './entities/insight.entity';
import { GetInsightsDto } from './dto/get-insights.dto';
import { InsightRepository } from './insight.repository';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { CreateInsightDto } from './dto/create-insight.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { TCreateInsight } from './interfaces/insight.interface';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { TInsightType } from './constants/insight-type.constant';
import { XP_ACTION_KEYS } from '@Constants/xp-action-keys.constant';
import { XpEventService } from '@Modules/xp-event/xp-event.service';
import { TInsightStatus } from './constants/insight-status.constant';
import { UpdateInsightStatusDto } from './dto/update-insight-status.dto';
import { isOverpayingVendor } from './utilities/overpaying-detection.utility';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { Transaction } from '@Modules/transaction/entities/transaction.entity';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';
import { ISpendingBaseline } from '@Modules/transaction/utilities/spending-baseline.utility';

@Injectable()
export class InsightService {
  private readonly logger = new TypedLogger('InsightService');

  constructor(
    private readonly insightRepository: InsightRepository,
    private readonly xpEventService: XpEventService,
    private readonly transactionService: TransactionService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  public getByUser(
    userId: string,
    data: GetInsightsDto,
  ): Promise<IBatchResult<Insight>> {
    return this.insightRepository.getByUser(userId, data);
  }

  public async getById(id: string, userId: string): Promise<Insight> {
    const insight = await this.insightRepository.findById(id, userId);

    if (insight == null) {
      throw new NotFoundException('Insight not found');
    }

    return insight;
  }

  public async create(
    userId: string,
    data: CreateInsightDto,
  ): Promise<Insight> {
    await this.assertReferencesBelongToUser(userId, data);

    try {
      return await this.insightRepository.create({ ...data, userId });
    } catch (error) {
      this.logger.error({ message: 'Failed to create insight', error });

      throw error;
    }
  }

  public async updateStatus(
    id: string,
    userId: string,
    data: UpdateInsightStatusDto,
  ): Promise<Insight> {
    const existingInsight = await this.getById(id, userId);

    await this.insightRepository.update(id, { status: data.status });

    const isNewlyActioned =
      data.status === TInsightStatus.ACTION_TAKEN &&
      existingInsight.status !== TInsightStatus.ACTION_TAKEN;

    if (isNewlyActioned) {
      await this.xpEventService.award(userId, XP_ACTION_KEYS.INSIGHT_DISMISSED);
    }

    return this.getById(id, userId);
  }

  public async generateForSubscription(
    userId: string,
    subscription: Subscription,
    vendor: Vendor,
    transaction?: SequelizeTransaction,
  ): Promise<void> {
    await this.maybeCreateOverpayingInsight(
      userId,
      subscription,
      vendor,
      transaction,
    );
    await this.maybeCreateRedundantSubscriptionInsight(
      userId,
      vendor,
      transaction,
    );
  }

  public async generateForTransaction(
    userId: string,
    transactionRecord: Transaction,
    vendor: Vendor,
    vendorBaseline: ISpendingBaseline,
    userBaseline: ISpendingBaseline,
  ): Promise<void> {
    await this.maybeCreateVendorSpikeInsight(
      userId,
      transactionRecord,
      vendor,
      vendorBaseline,
    );
    await this.maybeCreateLargePurchaseInsight(
      userId,
      transactionRecord,
      vendor,
      userBaseline,
    );
  }

  private async maybeCreateOverpayingInsight(
    userId: string,
    subscription: Subscription,
    vendor: Vendor,
    transaction?: SequelizeTransaction,
  ): Promise<void> {
    const isOverpaying = isOverpayingVendor(
      subscription.amount,
      subscription.currency,
      vendor,
    );

    if (!isOverpaying) {
      return;
    }

    // Non-null assertion is safe: isOverpayingVendor() already returned true, which requires
    // vendor.averageMarketPrice to be non-null.
    await this.createInsightIdempotent(
      {
        userId,
        type: TInsightType.OVERPAYING,
        subscriptionId: subscription.id,
        body: buildOverpayingInsightBody(
          vendor.name,
          subscription.amount,
          vendor.averageMarketPrice!,
        ),
      },
      transaction,
    );
  }

  private async maybeCreateRedundantSubscriptionInsight(
    userId: string,
    vendor: Vendor,
    transaction?: SequelizeTransaction,
  ): Promise<void> {
    if (!isRedundantServiceType(vendor.serviceType)) {
      return;
    }

    const activeSubscriptions =
      await this.subscriptionService.getActiveByServiceType(
        userId,
        vendor.serviceType,
        transaction,
      );
    const redundantGroup = buildRedundantServiceGroup(activeSubscriptions);

    if (redundantGroup == null) {
      return;
    }

    const existingInsight =
      await this.insightRepository.findUnreadBySubscriptions(
        userId,
        TInsightType.DUPLICATE,
        redundantGroup.subscriptionIds,
        transaction,
      );

    if (existingInsight != null) {
      return;
    }

    await this.createInsightIdempotent(
      {
        userId,
        type: TInsightType.DUPLICATE,
        subscriptionId: redundantGroup.anchorSubscriptionId,
        body: this.buildRedundancyBody(
          vendor.serviceType,
          redundantGroup.vendorNames,
        ),
      },
      transaction,
    );
  }

  private buildRedundancyBody(
    serviceType: TServiceType,
    vendorNames: string[],
  ): string {
    const isSameVendorTwice = vendorNames.length === 1;

    if (isSameVendorTwice) {
      return buildDuplicateInsightBody(vendorNames[0]);
    }

    return buildRedundantServiceInsightBody(
      SERVICE_TYPE_LABELS[serviceType],
      vendorNames,
    );
  }

  private async maybeCreateVendorSpikeInsight(
    userId: string,
    transactionRecord: Transaction,
    vendor: Vendor,
    vendorBaseline: ISpendingBaseline,
  ): Promise<void> {
    const isSpike = isVendorSpendingSpike(
      transactionRecord.amount,
      vendorBaseline,
    );

    if (!isSpike) {
      return;
    }

    await this.createInsightIdempotent({
      userId,
      type: TInsightType.HIGH_SPENDING,
      transactionId: transactionRecord.id,
      body: buildVendorSpendingSpikeInsightBody(
        vendor.name,
        transactionRecord.amount,
        vendorBaseline.average.toFixed(2),
      ),
    });
  }

  private async maybeCreateLargePurchaseInsight(
    userId: string,
    transactionRecord: Transaction,
    vendor: Vendor,
    userBaseline: ISpendingBaseline,
  ): Promise<void> {
    const isLargePurchase = isLargeOneOffPurchase(
      transactionRecord.amount,
      userBaseline,
    );

    if (!isLargePurchase) {
      return;
    }

    await this.createInsightIdempotent({
      userId,
      type: TInsightType.HIGH_SPENDING,
      transactionId: transactionRecord.id,
      body: buildLargePurchaseInsightBody(
        vendor.name,
        transactionRecord.amount,
      ),
    });
  }

  private async createInsightIdempotent(
    data: TCreateInsight,
    transaction?: SequelizeTransaction,
  ): Promise<void> {
    try {
      await this.insightRepository.create(data, transaction);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return;
      }

      this.logger.error({ message: 'Failed to create insight', error });

      throw error;
    }
  }

  private async assertReferencesBelongToUser(
    userId: string,
    data: CreateInsightDto,
  ): Promise<void> {
    if (data.subscriptionId != null) {
      await this.subscriptionService.getById(data.subscriptionId, userId);
    }

    if (data.transactionId != null) {
      await this.transactionService.getById(data.transactionId, userId);
    }
  }
}
