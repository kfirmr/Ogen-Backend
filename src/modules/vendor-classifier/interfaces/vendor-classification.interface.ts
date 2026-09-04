import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

export interface IVendorClassification {
  vendorName: string;
  category: TVendorCategory;
  serviceType: TServiceType;
  isLikelySubscription: boolean;
  cancellationEmail: string | null;
  billingCycle: TBillingCycle | null;
  estimatedAveragePrice: string | null;
}
