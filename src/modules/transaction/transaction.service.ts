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
