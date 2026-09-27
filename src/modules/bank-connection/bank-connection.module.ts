import { Module } from '@nestjs/common';
import { BankSyncController } from './bank-sync.controller';
import { InsightModule } from '@Modules/insight/insight.module';
import { XpEventModule } from '@Modules/xp-event/xp-event.module';
import { BankConnectionService } from './bank-connection.service';
import { DatabaseModule } from '@Providers/database/database.module';
import { BankConnectionController } from './bank-connection.controller';
import { BankConnectionRepository } from './bank-connection.repository';
import { TransactionModule } from '@Modules/transaction/transaction.module';
import { DraftActionModule } from '@Modules/draft-action/draft-action.module';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';
import { NotificationModule } from '@Providers/notification/notification.module';
import { StatementImportModule } from '@Modules/statement-import/statement-import.module';

@Module({
  imports: [
    DatabaseModule,
    XpEventModule,
    InsightModule,
    NotificationModule,
    DraftActionModule,
    TransactionModule,
    SubscriptionModule,
    StatementImportModule,
  ],
  controllers: [BankConnectionController, BankSyncController],
  exports: [BankConnectionService],
  providers: [BankConnectionService, BankConnectionRepository],
})
export class BankConnectionModule {}
