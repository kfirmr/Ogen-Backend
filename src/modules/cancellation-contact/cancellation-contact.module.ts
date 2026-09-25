import { Module } from '@nestjs/common';
import { AiModule } from '@Providers/ai/ai.module';
import { VendorModule } from '@Modules/vendor/vendor.module';
import { CancellationContactService } from './cancellation-contact.service';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';

@Module({
  imports: [AiModule, VendorModule, SubscriptionModule],
  exports: [CancellationContactService],
  providers: [CancellationContactService],
})
export class CancellationContactModule {}
