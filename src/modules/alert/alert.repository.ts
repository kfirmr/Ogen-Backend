import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from '@Utilities/pagination.utility';

import { Injectable } from '@nestjs/common';
import { Alert } from './entities/alert.entity';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { IBatchResult } from '@Interfaces/batch.interface';
import { IAlert, TCreateAlert } from './interfaces/alert.interface';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

@Injectable()
export class AlertRepository {
  public findById(id: string, userId: string): Promise<Alert | null> {
    return Alert.findOne({
      where: { id, userId },
      include: [{ model: Subscription, required: false }],
    });
  }

  public async getByUser(
    userId: string,
    data: GetAlertsDto,
  ): Promise<IBatchResult<Alert>> {
    const batchSize = resolveBatchSize(data.batchSize);
    const conditions = this.buildConditions(userId, data);

    const items = await Alert.findAll({
      limit: batchSize,
      where: conditions,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [{ model: Subscription, required: false }],
    });

    return { items, nextCursor: buildNextCursor(items, batchSize) };
  }

  public create(data: TCreateAlert, transaction?: Transaction): Promise<Alert> {
    return Alert.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<IAlert>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return Alert.update(data, { where: { id }, transaction });
  }

  private buildConditions(
    userId: string,
    data: GetAlertsDto,
  ): WhereOptions<Alert> {
    const filterConditions: WhereOptions<Alert>[] = [];

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
