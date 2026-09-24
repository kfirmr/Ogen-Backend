import { Module } from '@nestjs/common';
import { InsightService } from './insight.service';
import { InsightController } from './insight.controller';
import { InsightRepository } from './insight.repository';
import { InsightScanService } from './insight-scan.service';
import { XpEventModule } from '@Modules/xp-event/xp-event.module';
import { InsightScanRepository } from './insight-scan.repository';
import { DatabaseModule } from '@Providers/database/database.module';
import { TransactionModule } from '@Modules/transaction/transaction.module';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';

@Module({
  imports: [
    DatabaseModule,
    TransactionModule,
    SubscriptionModule,
    XpEventModule,
  ],
  controllers: [InsightController],
  exports: [InsightService, InsightScanService],
  providers: [
    InsightService,
    InsightRepository,
    InsightScanService,
    InsightScanRepository,
  ],
})
export class InsightModule {}
