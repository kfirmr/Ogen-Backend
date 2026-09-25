import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

export interface IVendorClassification {
  vendorName: string;
  chargeKind: TChargeKind;
  category: TVendorCategory;
  serviceType: TServiceType;
  billingCycle: TBillingCycle | null;
  estimatedAveragePrice: string | null;
}
