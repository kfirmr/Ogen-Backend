import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { AlertRepository } from './alert.repository';
import { DatabaseModule } from '@Providers/database/database.module';
import { TransactionModule } from '@Modules/transaction/transaction.module';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';

@Module({
  imports: [DatabaseModule, TransactionModule, SubscriptionModule],
  controllers: [AlertController],
  exports: [AlertService],
  providers: [AlertService, AlertRepository],
})
export class AlertModule {}
