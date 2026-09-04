import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from '@Utilities/pagination.utility';

import {
  ISubscription,
  TCreateSubscription,
} from './interfaces/subscription.interface';

import { Injectable } from '@nestjs/common';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Subscription } from './entities/subscription.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { GetSubscriptionsDto } from './dto/get-subscriptions.dto';
import { TBillingCycle } from './constants/billing-cycle.constant';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { TSubscriptionStatus } from './constants/subscription-status.constant';

@Injectable()
export class SubscriptionRepository {
  public findById(id: string, userId: string): Promise<Subscription | null> {
    return Subscription.findOne({
      where: { id, userId },
      include: [{ model: Vendor, required: false }],
    });
  }

  public async getByUser(
    userId: string,
    data: GetSubscriptionsDto,
  ): Promise<IBatchResult<Subscription>> {
    const batchSize = resolveBatchSize(data.batchSize);
    const conditions = this.buildConditions(userId, data);

    const items = await Subscription.findAll({
      limit: batchSize,
      where: conditions,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      include: [{ model: Vendor, required: false }],
    });

    return { items, nextCursor: buildNextCursor(items, batchSize) };
  }

  public findFirstActiveByVendor(
    userId: string,
    vendorId: string,
    transaction?: Transaction,
  ): Promise<Subscription | null> {
    return Subscription.findOne({
      where: { userId, vendorId, status: TSubscriptionStatus.ACTIVE },
      transaction,
    });
  }

  public getActiveByServiceType(
    userId: string,
    serviceType: TServiceType,
    transaction?: Transaction,
  ): Promise<Subscription[]> {
    return Subscription.findAll({
      where: { userId, status: TSubscriptionStatus.ACTIVE },
      include: [{ model: Vendor, required: true, where: { serviceType } }],
      transaction,
    });
  }

  public findActiveMatch(
    userId: string,
    vendorId: string,
    amount: string,
    billingCycle: TBillingCycle,
    transaction?: Transaction,
  ): Promise<Subscription | null> {
    return Subscription.findOne({
      where: {
        userId,
        vendorId,
        amount,
        billingCycle,
        status: TSubscriptionStatus.ACTIVE,
      },
      transaction,
    });
  }

  public create(
    data: TCreateSubscription,
    transaction?: Transaction,
  ): Promise<Subscription> {
    return Subscription.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<ISubscription>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return Subscription.update(data, { where: { id }, transaction });
  }

  public softDelete(id: string, transaction?: Transaction): Promise<number> {
    return Subscription.destroy({ where: { id }, transaction });
  }

  private buildConditions(
    userId: string,
    data: GetSubscriptionsDto,
  ): WhereOptions<Subscription> {
    const filterConditions: WhereOptions<Subscription>[] = [];

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
