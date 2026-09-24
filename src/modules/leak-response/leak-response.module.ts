import { Module } from '@nestjs/common';
import { VendorModule } from '@Modules/vendor/vendor.module';
import { LeakResponseService } from './leak-response.service';
import { InsightModule } from '@Modules/insight/insight.module';
import { DraftActionModule } from '@Modules/draft-action/draft-action.module';
import { SubscriptionModule } from '@Modules/subscription/subscription.module';
import { CancellationAgentModule } from '@Modules/cancellation-agent/cancellation-agent.module';

@Module({
  imports: [
    VendorModule,
    InsightModule,
    DraftActionModule,
    SubscriptionModule,
    CancellationAgentModule,
  ],
  exports: [LeakResponseService],
  providers: [LeakResponseService],
})
export class LeakResponseModule {}
