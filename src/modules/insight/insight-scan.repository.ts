import {
  ILargePurchaseRow,
  ISpendingSpikeRow,
  IOverpayingLeakRow,
  IDuplicateLeakGroup,
} from './interfaces/insight-scan.interface';

import {
  LARGE_PURCHASE_RATIO,
  OVERPAYING_THRESHOLD_RATIO,
  VENDOR_SPENDING_SPIKE_RATIO,
  MIN_TRANSACTIONS_FOR_BASELINE,
  MIN_VENDOR_HISTORY_FOR_SPIKE_CHECK,
} from './constants/insight-threshold.constant';

import { Op, Sequelize } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { Transaction } from '@Modules/transaction/entities/transaction.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';
import { TSubscriptionStatus } from '@Modules/subscription/constants/subscription-status.constant';

@Injectable()
export class InsightScanRepository {
  public async findOverpayingLeaks(
    userId: string,
  ): Promise<IOverpayingLeakRow[]> {
    const subscriptions = await Subscription.findAll({
      where: {
        userId,
        status: TSubscriptionStatus.ACTIVE,
        amount: {
          [Op.gt]: Sequelize.literal(
            `"vendor"."average_market_price" * ${OVERPAYING_THRESHOLD_RATIO}`,
          ),
        },
      },
      include: [
        {
          model: Vendor,
          required: true,
          where: {
            averageMarketPrice: { [Op.ne]: null },
            currency: { [Op.eq]: Sequelize.col('Subscription.currency') },
          },
        },
      ],
    });

    return subscriptions.map((subscription) => ({
      subscriptionId: subscription.id,
      // Non-null assertions are safe: the where clause above only ever matches subscriptions
      // whose vendor has a non-null averageMarketPrice.
      vendorId: subscription.vendorId!,
      vendorName: subscription.vendor.name,
      amount: subscription.amount,
      currency: subscription.currency,
      averageMarketPrice: subscription.vendor.averageMarketPrice!,
    }));
  }

  public async findDuplicateSubscriptionGroups(
    userId: string,
  ): Promise<IDuplicateLeakGroup[]> {
    const groups = await Subscription.findAll({
      where: { userId, status: TSubscriptionStatus.ACTIVE },
      attributes: [
        [Sequelize.col('vendor.service_type'), 'serviceType'],
        [this.buildOrderedArrayAgg('"Subscription"."id"'), 'subscriptionIds'],
        [this.buildOrderedArrayAgg('"vendor"."name"'), 'vendorNames'],
        [this.buildOrderedArrayAgg('"Subscription"."amount"'), 'amounts'],
      ],
      include: [
        {
          model: Vendor,
          required: true,
          attributes: [],
          where: { serviceType: { [Op.ne]: 'NONE' } },
        },
      ],
      group: ['vendor.service_type'],
      having: Sequelize.literal('COUNT(*) > 1'),
    });

    return groups.map((group) => {
      const vendorNames = this.readStringArray(group.get('vendorNames'));

      return {
        serviceType: this.readServiceType(group.get('serviceType')),
        vendorNames: [...new Set(vendorNames)],
        subscriptionIds: this.readStringArray(group.get('subscriptionIds')),
        anchorSubscriptionId: this.readStringArray(
          group.get('subscriptionIds'),
        )[0],
        anchorAmount: this.readStringArray(group.get('amounts'))[0],
      };
    });
  }

  public async findVendorSpendingSpikes(
    userId: string,
    importId: string,
  ): Promise<ISpendingSpikeRow[]> {
    const averageExpression = this.buildHistorySubquery('vendor', 'avg');
    const countExpression = this.buildHistorySubquery('vendor', 'count');

    const transactions = await Transaction.findAll({
      where: {
        userId,
        importId,
        vendorId: { [Op.ne]: null },
        [Op.and]: [
          Sequelize.literal(
            `${countExpression} >= ${MIN_VENDOR_HISTORY_FOR_SPIKE_CHECK}`,
          ),
          Sequelize.literal(
            `"Transaction"."amount" > ${averageExpression} * ${VENDOR_SPENDING_SPIKE_RATIO}`,
          ),
        ],
      },
      attributes: [
        'id',
        'vendorId',
        'amount',
        [Sequelize.literal(averageExpression), 'vendorAverage'],
        [Sequelize.literal(countExpression), 'vendorCount'],
      ],
      include: [{ model: Vendor, attributes: ['name'], required: true }],
      replacements: { importId },
    });

    return transactions.map((transaction) => ({
      transactionId: transaction.id,
      // Safe: the where clause above requires vendorId to be non-null.
      vendorId: transaction.vendorId!,
      vendorName: transaction.vendor.name,
      amount: transaction.amount,
      vendorAverage: this.readString(transaction.get('vendorAverage')),
      vendorCount: this.readNumber(transaction.get('vendorCount')),
    }));
  }

  public async findLargeOneOffPurchases(
    userId: string,
    importId: string,
  ): Promise<ILargePurchaseRow[]> {
    const averageExpression = this.buildHistorySubquery('user', 'avg');
    const countExpression = this.buildHistorySubquery('user', 'count');

    const transactions = await Transaction.findAll({
      where: {
        userId,
        importId,
        vendorId: { [Op.ne]: null },
        [Op.and]: [
          Sequelize.literal(
            `${countExpression} >= ${MIN_TRANSACTIONS_FOR_BASELINE}`,
          ),
          Sequelize.literal(
            `"Transaction"."amount" > ${averageExpression} * ${LARGE_PURCHASE_RATIO}`,
          ),
        ],
      },
      attributes: [
        'id',
        'amount',
        [Sequelize.literal(averageExpression), 'userAverage'],
        [Sequelize.literal(countExpression), 'userCount'],
      ],
      include: [{ model: Vendor, attributes: ['name'], required: true }],
      replacements: { importId },
    });

    return transactions.map((transaction) => ({
      transactionId: transaction.id,
      vendorName: transaction.vendor.name,
      amount: transaction.amount,
      userAverage: this.readString(transaction.get('userAverage')),
      userCount: this.readNumber(transaction.get('userCount')),
    }));
  }

  private buildOrderedArrayAgg(
    column: string,
  ): ReturnType<typeof Sequelize.fn> {
    return Sequelize.fn(
      'array_agg',
      Sequelize.literal(
        `${column} ORDER BY "Subscription"."created_at" ASC, "Subscription"."id" ASC`,
      ),
    );
  }

  // A correlated scalar subquery, not a LATERAL join: Sequelize's builder has no LATERAL
  // primitive, so this is the one place per query the ORM genuinely cannot express the
  // "this vendor's/user's history excluding the current import" baseline. Scoped by vendor
  // for a vendor-specific spending spike, or left unscoped for a user-wide large purchase.
  private buildHistorySubquery(
    scope: 'vendor' | 'user',
    aggregate: 'avg' | 'count',
  ): string {
    const vendorCondition =
      scope === 'vendor' ? 'AND h.vendor_id = "Transaction"."vendor_id"' : '';
    const select =
      aggregate === 'avg' ? 'AVG(h.amount)::numeric(12,2)' : 'COUNT(*)::int';

    return `(
      SELECT ${select}
      FROM transactions h
      WHERE h.user_id = "Transaction"."user_id"
        ${vendorCondition}
        AND h.deleted_at IS NULL
        AND h.id <> "Transaction"."id"
        AND h.import_id IS DISTINCT FROM :importId
    )`;
  }

  // Model#get() on a computed/aggregated attribute is untyped by design (Sequelize has no way
  // to know its shape ahead of time); these narrow it to the primitive the SQL above guarantees,
  // the same boundary role a type guard plays for genuinely external input.
  private readString(value: unknown): string {
    return String(value);
  }

  private readNumber(value: unknown): number {
    return Number(value);
  }

  private readStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private readServiceType(value: unknown): IDuplicateLeakGroup['serviceType'] {
    return value as IDuplicateLeakGroup['serviceType'];
  }
}
