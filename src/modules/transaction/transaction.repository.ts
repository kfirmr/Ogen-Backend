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

import {
  ITransaction,
  TCreateTransaction,
} from './interfaces/transaction.interface';

import { Injectable } from '@nestjs/common';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Transaction } from './entities/transaction.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { GetTransactionsDto } from './dto/get-transactions.dto';

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

  public create(
    data: TCreateTransaction,
    transaction?: SequelizeTransaction,
  ): Promise<Transaction> {
    return Transaction.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<ITransaction>,
    transaction?: SequelizeTransaction,
  ): Promise<[number]> {
    return Transaction.update(data, { where: { id }, transaction });
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
