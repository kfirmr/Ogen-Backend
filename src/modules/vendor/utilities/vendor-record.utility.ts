import {
  TCreateVendor,
  IVendorClassificationDefaults,
} from '../interfaces/vendor.interface';

// A newly classified vendor has no cancellation contact yet; the contact lookup fills it later.
export const toNewVendor = (
  name: string,
  defaults: IVendorClassificationDefaults,
): TCreateVendor => ({
  name,
  category: defaults.category,
  chargeKind: defaults.chargeKind,
  serviceType: defaults.serviceType,
  billingCycle: defaults.billingCycle,
  averageMarketPrice: defaults.averageMarketPrice,
  cancellationUrl: null,
  cancellationEmail: null,
  cancellationPhone: null,
  cancellationMethod: null,
  cancellationSourceUrl: null,
  cancellationCheckedAt: null,
});
