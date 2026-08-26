import { Module } from '@nestjs/common';
import { VendorModule } from '@Modules/vendor/vendor.module';
import { SubscriptionService } from './subscription.service';
import { XpEventModule } from '@Modules/xp-event/xp-event.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionRepository } from './subscription.repository';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule, VendorModule, XpEventModule],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
  providers: [SubscriptionService, SubscriptionRepository],
})
export class SubscriptionModule {}
