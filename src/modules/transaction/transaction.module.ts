import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from './transaction.repository';
import { DatabaseModule } from '@Providers/database/database.module';
import { VendorAliasModule } from '@Modules/vendor-alias/vendor-alias.module';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';

@Module({
  imports: [DatabaseModule, VendorAliasModule, SubscriptionModule],
  controllers: [TransactionController],
  exports: [TransactionService],
  providers: [TransactionService, TransactionRepository],
})
export class TransactionModule {}
