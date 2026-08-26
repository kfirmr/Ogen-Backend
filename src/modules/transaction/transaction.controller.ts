import {
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { IBatchResult } from '@Interfaces/batch.interface';
import { TransactionService } from './transaction.service';
import { Transaction } from './entities/transaction.entity';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AttachSubscriptionDto } from './dto/attach-subscription.dto';

@ApiTags('transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('search')
  public getByUser(
    @CurrentUser() userId: string,
    @Body() data: GetTransactionsDto,
  ): Promise<IBatchResult<Transaction>> {
    return this.transactionService.getByUser(userId, data);
  }

  @Post()
  public create(
    @CurrentUser() userId: string,
    @Body() data: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionService.create(userId, data);
  }

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Transaction> {
    return this.transactionService.getById(id, userId);
  }

  @Patch(':id/subscription')
  public attachSubscription(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: AttachSubscriptionDto,
  ): Promise<Transaction> {
    return this.transactionService.attachSubscription(id, userId, data);
  }

  @Delete(':id')
  public delete(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.transactionService.delete(id, userId);
  }
}
