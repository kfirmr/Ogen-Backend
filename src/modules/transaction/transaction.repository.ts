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
  ITransaction,
  ICategorySpendRow,
  TCreateTransaction,
  ISubscriptionChargeRow,
} from './interfaces/transaction.interface';

import { Injectable } from '@nestjs/common';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Transaction } from './entities/transaction.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { IVendorChargeLinkRequest } from './interfaces/recurrence.interface';
import { GetTransactionSummaryDto } from './dto/get-transaction-summary.dto';
import { toVendorCategory } from '@Modules/vendor/utilities/vendor-category.utility';

// Subscription charges are counted from the subscription's own price, so they are left out here.
const NON_SUBSCRIPTION_AMOUNT_SQL =
  'CASE WHEN "Transaction"."subscription_id" IS NULL THEN "Transaction"."amount" ELSE 0 END';

@Injectable()
export class TransactionRepository {
  public findById(id: string, userId: string): Promise<Transaction | null> {
    return Transaction.findOne({
      where: { id, userId },
      include: [{ model: Vendor, required: false }],
    });
  }

  public async getByUser(
    userId: string,
    data: GetTransactionsDto,
  ): Promise<IBatchResult<Transaction>> {
    const batchSize = resolveBatchSize(data.batchSize);
    const conditions = this.buildConditions(userId, data);

    const items = await Transaction.findAll({
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

  // Summed in SQL so a month's totals never depend on how many rows a client page holds.
  public async getCategorySpend(
    userId: string,
    data: GetTransactionSummaryDto,
  ): Promise<ICategorySpendRow[]> {
    const groups = await Transaction.findAll({
      where: {
        userId,
        transactionDate: { [Op.between]: [data.fromDate, data.toDate] },
      },
      attributes: [
        [Sequelize.col('vendor.category'), 'category'],
        [Sequelize.fn('SUM', Sequelize.col('Transaction.amount')), 'amount'],
        [
          Sequelize.fn('SUM', Sequelize.literal(NON_SUBSCRIPTION_AMOUNT_SQL)),
          'nonSubscriptionAmount',
        ],
      ],
      include: [{ model: Vendor, attributes: [], required: false }],
      group: ['vendor.category'],
    });

    return groups.map((group) => ({
      amount: String(group.get('amount')),
      category: toVendorCategory(group.get('category')),
      nonSubscriptionAmount: String(group.get('nonSubscriptionAmount')),
    }));
  }

  public async getSubscriptionCharges(
    userId: string,
    data: GetTransactionSummaryDto,
  ): Promise<ISubscriptionChargeRow[]> {
    const groups = await Transaction.findAll({
      where: {
        userId,
        subscriptionId: { [Op.ne]: null },
        transactionDate: { [Op.between]: [data.fromDate, data.toDate] },
      },
      attributes: [
        'subscriptionId',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount'],
      ],
      group: ['subscriptionId'],
    });

    return groups.map((group) => ({
      amount: String(group.get('amount')),
      subscriptionId: String(group.get('subscriptionId')),
    }));
  }

  public findByImports(
    userId: string,
    importIds: string[],
    transaction?: SequelizeTransaction,
  ): Promise<Transaction[]> {
    if (importIds.length === 0) {
      return Promise.resolve([]);
    }

    return Transaction.findAll({
      attributes: ['id', 'subscriptionId'],
      where: { userId, importId: { [Op.in]: importIds } },
      transaction,
    });
  }

  public async findChargedSubscriptionIds(
    userId: string,
    subscriptionIds: string[],
    transaction?: SequelizeTransaction,
  ): Promise<string[]> {
    if (subscriptionIds.length === 0) {
      return [];
    }

    const charges = await Transaction.findAll({
      attributes: ['subscriptionId'],
      where: { userId, subscriptionId: { [Op.in]: subscriptionIds } },
      group: ['subscriptionId'],
      transaction,
    });

    return charges.flatMap((charge) =>
      charge.subscriptionId === null ? [] : [charge.subscriptionId],
    );
  }

  public softDeleteByIds(
    userId: string,
    ids: string[],
    transaction?: SequelizeTransaction,
  ): Promise<number> {
    if (ids.length === 0) {
      return Promise.resolve(0);
    }

    return Transaction.destroy({
      where: { userId, id: { [Op.in]: ids } },
      transaction,
    });
  }

  public findByDates(
    userId: string,
    transactionDates: string[],
  ): Promise<Transaction[]> {
    if (transactionDates.length === 0) {
      return Promise.resolve([]);
    }

    return Transaction.findAll({
      attributes: ['transactionDate', 'amount'],
      where: { userId, transactionDate: { [Op.in]: transactionDates } },
    });
  }

  public getChargesForVendors(
    userId: string,
    vendorIds: string[],
  ): Promise<Transaction[]> {
    if (vendorIds.length === 0) {
      return Promise.resolve([]);
    }

    return Transaction.findAll({
      where: { userId, vendorId: { [Op.in]: vendorIds } },
      attributes: ['vendorId', 'amount', 'currency', 'transactionDate'],
    });
  }

  public async findExistingExternalIds(
    userId: string,
    externalIds: string[],
  ): Promise<string[]> {
    const transactions = await Transaction.findAll({
      where: { userId, externalId: { [Op.in]: externalIds } },
      attributes: ['externalId'],
    });

    return transactions.map((transaction) => transaction.externalId as string);
  }

  public create(
    data: TCreateTransaction,
    transaction?: SequelizeTransaction,
  ): Promise<Transaction> {
    return Transaction.create(data, { transaction });
  }

  public bulkCreateForImport(
    records: TCreateTransaction[],
    transaction?: SequelizeTransaction,
  ): Promise<Transaction[]> {
    return Transaction.bulkCreate(records, { transaction, returning: true });
  }

  public update(
    id: string,
    data: Partial<ITransaction>,
    transaction?: SequelizeTransaction,
  ): Promise<[number]> {
    return Transaction.update(data, { where: { id }, transaction });
  }

  public linkUnassignedVendorCharges(
    request: IVendorChargeLinkRequest,
    transaction?: SequelizeTransaction,
  ): Promise<[number]> {
    return Transaction.update(
      { subscriptionId: request.subscriptionId },
      {
        where: {
          subscriptionId: null,
          userId: request.userId,
          vendorId: request.vendorId,
          amount: {
            [Op.between]: [request.amountRange.min, request.amountRange.max],
          },
        },
        transaction,
      },
    );
  }

  public softDelete(
    id: string,
    transaction?: SequelizeTransaction,
  ): Promise<number> {
    return Transaction.destroy({ where: { id }, transaction });
  }

  public softDeleteByImport(
    userId: string,
    importId: string,
    transaction?: SequelizeTransaction,
  ): Promise<number> {
    return Transaction.destroy({ where: { userId, importId }, transaction });
  }

  private buildConditions(
    userId: string,
    data: GetTransactionsDto,
  ): WhereOptions<Transaction> {
    const filterConditions: WhereOptions<Transaction>[] = [];

    if (data.vendorId != null) {
      filterConditions.push({ vendorId: data.vendorId });
    }

    if (data.importId != null) {
      filterConditions.push({ importId: data.importId });
    }

    if (data.subscriptionId != null) {
      filterConditions.push({ subscriptionId: data.subscriptionId });
    }

    if (data.fromDate != null) {
      filterConditions.push({ transactionDate: { [Op.gte]: data.fromDate } });
    }

    if (data.toDate != null) {
      filterConditions.push({ transactionDate: { [Op.lte]: data.toDate } });
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
