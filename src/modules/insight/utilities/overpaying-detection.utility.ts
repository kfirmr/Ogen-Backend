import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { OVERPAYING_THRESHOLD_RATIO } from '../constants/insight-threshold.constant';

export const isOverpayingVendor = (
  subscriptionAmount: string,
  subscriptionCurrency: string,
  vendor: Vendor,
): boolean => {
  const hasNoMarketPrice = vendor.averageMarketPrice == null;
  const hasCurrencyMismatch = vendor.currency !== subscriptionCurrency;

  if (hasNoMarketPrice || hasCurrencyMismatch) {
    return false;
  }

  return (
    Number(subscriptionAmount) >
    Number(vendor.averageMarketPrice) * OVERPAYING_THRESHOLD_RATIO
  );
};
