import { Optional } from 'sequelize';
import { TChargeKind } from '../constants/charge-kind.constant';
import { TServiceType } from '../constants/service-type.constant';
import { TVendorCategory } from '../constants/vendor-category.constant';
import { TCancellationMethod } from '../constants/cancellation-method.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

export interface IVendor {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  chargeKind: TChargeKind | null;
  cancellationUrl: string | null;
  cancellationEmail: string | null;
  cancellationPhone: string | null;
  category: TVendorCategory | null;
  serviceType: TServiceType | null;
  averageMarketPrice: string | null;
  cancellationCheckedAt: Date | null;
  billingCycle: TBillingCycle | null;
  cancellationSourceUrl: string | null;
  cancellationMethod: TCancellationMethod | null;
}

export type TCreateVendor = Optional<
  IVendor,
  'id' | 'currency' | 'createdAt' | 'updatedAt'
>;

export interface IVendorClassificationDefaults {
  chargeKind: TChargeKind;
  category: TVendorCategory | null;
  serviceType: TServiceType | null;
  averageMarketPrice: string | null;
  billingCycle: TBillingCycle | null;
}

export interface IVendorNameEntry {
  name: string;
  defaults: IVendorClassificationDefaults;
}

export interface ISimilarVendorMatch {
  vendorId: string;
  queryName: string;
}

export interface ISimilarNamePair {
  firstName: string;
  secondName: string;
}
