import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { UserModule } from '@Modules/user/user.module';
import { AuthModule } from '@Modules/auth/auth.module';
import { LevelModule } from '@Modules/level/level.module';
import { VendorModule } from '@Modules/vendor/vendor.module';
import { InsightModule } from '@Modules/insight/insight.module';
import { XpEventModule } from '@Modules/xp-event/xp-event.module';
import { XpActionModule } from '@Modules/xp-action/xp-action.module';
import { DatabaseModule } from './providers/database/database.module';
import { TransactionModule } from '@Modules/transaction/transaction.module';
import { VendorAliasModule } from '@Modules/vendor-alias/vendor-alias.module';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';
import { StatementImportModule } from '@Modules/statement-import/statement-import.module';
import { VendorClassifierModule } from '@Modules/vendor-classifier/vendor-classifier.module';

@Module({
  imports: [
    DatabaseModule,

    InsightModule,
    AuthModule,
    UserModule,
    LevelModule,
    XpActionModule,
    XpEventModule,
    VendorModule,
    VendorAliasModule,
    VendorClassifierModule,
    TransactionModule,
    SubscriptionModule,
    StatementImportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
