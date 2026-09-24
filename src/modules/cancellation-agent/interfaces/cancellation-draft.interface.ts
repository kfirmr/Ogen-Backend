import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { Insight } from '@Modules/insight/entities/insight.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

export interface ICancellationDraftContext {
  vendor: Vendor;
  insight: Insight;
  subscription: Subscription | null;
}

export interface IDraftedCancellation {
  body: string;
  subject: string;
  reasoning: string;
}
