import { Optional } from 'sequelize';
import { TServiceType } from '../constants/service-type.constant';
import { TVendorCategory } from '../constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

export interface IVendor {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  cancellationEmail: string | null;
  category: TVendorCategory | null;
  serviceType: TServiceType | null;
  averageMarketPrice: string | null;
  billingCycle: TBillingCycle | null;
  isLikelySubscription: boolean | null;
}

export type TCreateVendor = Optional<
  IVendor,
  'id' | 'currency' | 'createdAt' | 'updatedAt'
>;
