import {
  Op,
  WhereOptions,
  Transaction as SequelizeTransaction,
} from 'sequelize';

import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from '@Utilities/pagination.utility';

import { Injectable } from '@nestjs/common';
import { Insight } from './entities/insight.entity';
import { GetInsightsDto } from './dto/get-insights.dto';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { TInsightType } from './constants/insight-type.constant';
import { TInsightStatus } from './constants/insight-status.constant';
import { IInsight, TCreateInsight } from './interfaces/insight.interface';
import { Transaction } from '@Modules/transaction/entities/transaction.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

const INSIGHT_INCLUDES = [
  { model: Subscription, required: false, include: [Vendor] },
  { model: Transaction, required: false, include: [Vendor] },
];

@Injectable()
export class InsightRepository {
  public findById(id: string, userId: string): Promise<Insight | null> {
    return Insight.findOne({
      where: { id, userId },
      include: INSIGHT_INCLUDES,
    });
  }

  public async getByUser(
    userId: string,
    data: GetInsightsDto,
  ): Promise<IBatchResult<Insight>> {
    const batchSize = resolveBatchSize(data.batchSize);
    const conditions = this.buildConditions(userId, data);

    const items = await Insight.findAll({
      limit: batchSize,
      where: conditions,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      include: INSIGHT_INCLUDES,
    });

    return { items, nextCursor: buildNextCursor(items, batchSize) };
  }

  public findUnreadBySubscriptions(
    userId: string,
    type: TInsightType,
    subscriptionIds: string[],
    transaction?: SequelizeTransaction,
  ): Promise<Insight | null> {
    return Insight.findOne({
      where: {
        type,
        userId,
        status: TInsightStatus.UNREAD,
        subscriptionId: { [Op.in]: subscriptionIds },
      },
      transaction,
    });
  }

  public create(
    data: TCreateInsight,
    transaction?: SequelizeTransaction,
  ): Promise<Insight> {
    return Insight.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<IInsight>,
    transaction?: SequelizeTransaction,
  ): Promise<[number]> {
    return Insight.update(data, { where: { id }, transaction });
  }

  private buildConditions(
    userId: string,
    data: GetInsightsDto,
  ): WhereOptions<Insight> {
    const filterConditions: WhereOptions<Insight>[] = [];

    if (data.type != null) {
      filterConditions.push({ type: data.type });
    }

    if (data.status != null) {
      filterConditions.push({ status: data.status });
    }

    return {
      [Op.and]: [
        { userId },
        buildCursorCondition(data.batchCursor),
        ...filterConditions,
      ],
    };
  }
}
