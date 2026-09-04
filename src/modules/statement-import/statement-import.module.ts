import { Module } from '@nestjs/common';
import { VendorModule } from '@Modules/vendor/vendor.module';
import { InsightModule } from '@Modules/insight/insight.module';
import { StatementImportService } from './statement-import.service';
import { DatabaseModule } from '@Providers/database/database.module';
import { StatementImportController } from './statement-import.controller';
import { StatementImportRepository } from './statement-import.repository';
import { TransactionModule } from '@Modules/transaction/transaction.module';
import { VendorAliasModule } from '@Modules/vendor-alias/vendor-alias.module';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';
import { VendorClassifierModule } from '@Modules/vendor-classifier/vendor-classifier.module';

@Module({
  imports: [
    DatabaseModule,
    VendorModule,
    VendorAliasModule,
    SubscriptionModule,
    TransactionModule,
    VendorClassifierModule,
    InsightModule,
  ],
  controllers: [StatementImportController],
  exports: [StatementImportService],
  providers: [StatementImportService, StatementImportRepository],
})
export class StatementImportModule {}
