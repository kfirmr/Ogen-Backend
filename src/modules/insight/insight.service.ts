import { Insight } from './entities/insight.entity';
import { GetInsightsDto } from './dto/get-insights.dto';
import { InsightRepository } from './insight.repository';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { CreateInsightDto } from './dto/create-insight.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { XP_ACTION_KEYS } from '@Constants/xp-action-keys.constant';
import { XpEventService } from '@Modules/xp-event/xp-event.service';
import { TInsightStatus } from './constants/insight-status.constant';
import { UpdateInsightStatusDto } from './dto/update-insight-status.dto';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';

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
