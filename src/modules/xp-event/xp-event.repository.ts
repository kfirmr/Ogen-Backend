import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from '@Utilities/pagination.utility';

import { Injectable } from '@nestjs/common';
import { XpEvent } from './entities/xp-event.entity';
import { GetXpEventsDto } from './dto/get-xp-events.dto';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { IBatchResult } from '@Interfaces/batch.interface';
import { TCreateXpEvent } from './interfaces/xp-event.interface';
import { XpAction } from '@Modules/xp-action/entities/xp-action.entity';

@Injectable()
export class XpEventRepository {
  public create(
    data: TCreateXpEvent,
    transaction?: Transaction,
  ): Promise<XpEvent> {
    return XpEvent.create(data, { transaction });
  }

  public async getByUser(
    userId: string,
    data: GetXpEventsDto,
  ): Promise<IBatchResult<XpEvent>> {
    const batchSize = resolveBatchSize(data.batchSize);
    const conditions = this.buildConditions(userId, data);

    const items = await XpEvent.findAll({
      limit: batchSize,
      where: conditions,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [{ model: XpAction, required: true }],
    });

    return { items, nextCursor: buildNextCursor(items, batchSize) };
  }

  private buildConditions(
    userId: string,
    data: GetXpEventsDto,
  ): WhereOptions<XpEvent> {
    const filterConditions: WhereOptions<XpEvent>[] = [];

    if (data.xpActionId != null) {
      filterConditions.push({ xpActionId: data.xpActionId });
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
