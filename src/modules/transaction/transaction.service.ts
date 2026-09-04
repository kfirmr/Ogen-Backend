import {
  ISpendingBaseline,
  computeSpendingBaseline,
} from './utilities/spending-baseline.utility';

import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Transaction } from './entities/transaction.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Transaction as SequelizeTransaction } from 'sequelize';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { TransactionRepository } from './transaction.repository';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AttachSubscriptionDto } from './dto/attach-subscription.dto';
import { VendorAliasService } from '@Modules/vendor-alias/vendor-alias.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { TCreateTransactionForImport } from './interfaces/transaction.interface';

@Injectable()
export class TransactionService {
  private readonly logger = new TypedLogger('TransactionService');

  constructor(
    private readonly vendorAliasService: VendorAliasService,
    private readonly subscriptionService: SubscriptionService,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  public getByUser(
    userId: string,
    data: GetTransactionsDto,
  ): Promise<IBatchResult<Transaction>> {
    return this.transactionRepository.getByUser(userId, data);
  }

  public async getById(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findById(id, userId);

    if (transaction == null) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  public async create(
    userId: string,
    data: CreateTransactionDto,
  ): Promise<Transaction> {
    if (data.subscriptionId != null) {
      await this.subscriptionService.getById(data.subscriptionId, userId);
    }

    const vendorId = await this.vendorAliasService.resolveVendorId(
      data.originalDescription,
    );

    try {
      return await this.transactionRepository.create({
        ...data,
        userId,
        vendorId,
      });
    } catch (error) {
      this.logger.error({ message: 'Failed to create transaction', error });

      throw error;
    }
  }

  public async isDuplicate(
    userId: string,
    transactionDate: string,
    amount: string,
  ): Promise<boolean> {
    const duplicate = await this.transactionRepository.findDuplicateForImport(
      userId,
      transactionDate,
      amount,
    );

    return duplicate != null;
  }

  public async getAverageAmountForVendor(
    userId: string,
    vendorId: string,
  ): Promise<ISpendingBaseline> {
    const amounts = await this.transactionRepository.getAmountsForVendor(
      userId,
      vendorId,
    );

    return computeSpendingBaseline(amounts);
  }

  public async getAverageAmountForUser(
    userId: string,
  ): Promise<ISpendingBaseline> {
    const amounts = await this.transactionRepository.getAmountsForUser(userId);

    return computeSpendingBaseline(amounts);
  }

  public async createForImport(
    userId: string,
    data: TCreateTransactionForImport,
    transaction?: SequelizeTransaction,
  ): Promise<Transaction> {
    try {
      return await this.transactionRepository.create(
        { ...data, userId },
        transaction,
      );
    } catch (error) {
      this.logger.error({
        message: 'Failed to create transaction for import',
        error,
      });

      throw error;
    }
  }

  public async bulkCreateForImport(
    userId: string,
    rows: TCreateTransactionForImport[],
    transaction?: SequelizeTransaction,
  ): Promise<Transaction[]> {
    try {
      return await this.transactionRepository.bulkCreateForImport(
        rows.map((row) => ({ ...row, userId })),
        transaction,
      );
    } catch (error) {
      this.logger.error({
        message: 'Failed to bulk create transactions for import',
        error,
      });

      throw error;
    }
  }

  public async findExistingExternalIds(
    userId: string,
    externalIds: string[],
  ): Promise<Set<string>> {
    if (externalIds.length === 0) {
      return new Set();
    }

    const existingExternalIds =
      await this.transactionRepository.findExistingExternalIds(
        userId,
        externalIds,
      );

    return new Set(existingExternalIds);
  }

  public async attachSubscription(
    id: string,
    userId: string,
    data: AttachSubscriptionDto,
  ): Promise<Transaction> {
    await this.getById(id, userId);

    if (data.subscriptionId != null) {
      await this.subscriptionService.getById(data.subscriptionId, userId);
    }

    await this.transactionRepository.update(id, {
      subscriptionId: data.subscriptionId ?? null,
    });

    return this.getById(id, userId);
  }

  public async delete(id: string, userId: string): Promise<void> {
    await this.getById(id, userId);
    await this.transactionRepository.softDelete(id);
  }

  public deleteByImport(
    userId: string,
    importId: string,
    transaction?: SequelizeTransaction,
  ): Promise<number> {
    return this.transactionRepository.softDeleteByImport(
      userId,
      importId,
      transaction,
    );
  }
}
