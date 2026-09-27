import {
  Op,
  Sequelize,
  WhereOptions,
  Transaction as SequelizeTransaction,
} from 'sequelize';

import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from '@Utilities/pagination.utility';

import {
  IInsight,
  IInsightLinks,
  TCreateInsight,
} from './interfaces/insight.interface';

import { Injectable } from '@nestjs/common';
import { Insight } from './entities/insight.entity';
import { GetInsightsDto } from './dto/get-insights.dto';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { INSIGHT_METADATA_KEYS } from './constants/insight-metadata.constant';
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

  public async findIdsLinkedTo(
    userId: string,
    linked: IInsightLinks,
    transaction?: SequelizeTransaction,
  ): Promise<string[]> {
    const hasLinks =
      linked.subscriptionIds.length > 0 || linked.transactionIds.length > 0;

    if (!hasLinks) {
      return [];
    }

    const insights = await Insight.findAll({
      attributes: ['id'],
      where: { userId, [Op.or]: this.buildLinkConditions(linked) },
      replacements: { subscriptionIds: linked.subscriptionIds },
      transaction,
    });

    return insights.map((insight) => insight.id);
  }

  public deleteByIds(
    ids: string[],
    transaction?: SequelizeTransaction,
  ): Promise<number> {
    if (ids.length === 0) {
      return Promise.resolve(0);
    }

    return Insight.destroy({ where: { id: { [Op.in]: ids } }, transaction });
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

  // A duplicate-service insight is anchored on one subscription and lists the others only in its
  // metadata, so removing any listed subscription must also remove the insight.
  private buildLinkConditions(linked: IInsightLinks): WhereOptions<Insight>[] {
    const directLinks: WhereOptions<Insight>[] = [
      { subscriptionId: { [Op.in]: linked.subscriptionIds } },
      { transactionId: { [Op.in]: linked.transactionIds } },
    ];

    if (linked.subscriptionIds.length === 0) {
      return directLinks;
    }

    return [
      ...directLinks,
      Sequelize.literal(
        `"Insight"."metadata"->'${INSIGHT_METADATA_KEYS.SUBSCRIPTION_IDS}' ?| ARRAY[:subscriptionIds]::text[]`,
      ),
    ];
  }
}
