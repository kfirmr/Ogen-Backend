import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from '@Utilities/pagination.utility';

import {
  IDraftAction,
  TCreateDraftAction,
} from './interfaces/draft-action.interface';

import { Injectable } from '@nestjs/common';
import { Op, WhereOptions } from 'sequelize';
import { IBatchResult } from '@Interfaces/batch.interface';
import { DraftAction } from './entities/draft-action.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { GetDraftActionsDto } from './dto/get-draft-actions.dto';
import { Insight } from '@Modules/insight/entities/insight.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

const DRAFT_ACTION_INCLUDES = [
  { model: Insight, required: false },
  { model: Subscription, required: false },
  { model: Vendor, required: false },
];

@Injectable()
export class DraftActionRepository {
  public findById(id: string, userId: string): Promise<DraftAction | null> {
    return DraftAction.findOne({
      where: { id, userId },
      include: DRAFT_ACTION_INCLUDES,
    });
  }

  public findByInsight(insightId: string): Promise<DraftAction | null> {
    return DraftAction.findOne({ where: { insightId } });
  }

  public async getByUser(
    userId: string,
    data: GetDraftActionsDto,
  ): Promise<IBatchResult<DraftAction>> {
    const batchSize = resolveBatchSize(data.batchSize);
    const conditions = this.buildConditions(userId, data);

    const items = await DraftAction.findAll({
      limit: batchSize,
      where: conditions,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      include: DRAFT_ACTION_INCLUDES,
    });

    return { items, nextCursor: buildNextCursor(items, batchSize) };
  }

  public create(data: TCreateDraftAction): Promise<DraftAction> {
    return DraftAction.create(data);
  }

  public update(id: string, data: Partial<IDraftAction>): Promise<[number]> {
    return DraftAction.update(data, { where: { id } });
  }

  private buildConditions(
    userId: string,
    data: GetDraftActionsDto,
  ): WhereOptions<DraftAction> {
    const filterConditions: WhereOptions<DraftAction>[] = [];

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
