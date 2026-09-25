import { IVendor } from '../interfaces/vendor.interface';
import { TChargeKind } from '../constants/charge-kind.constant';
import { NON_SUBSCRIPTION_CATEGORIES } from '../constants/vendor-category.constant';

// The category gate is deliberately independent of chargeKind so a misclassified essential bill
// (e.g. an electricity company tagged SUBSCRIPTION) still can never become a subscription.
export const isSubscriptionCandidate = (
  vendor: Pick<IVendor, 'category' | 'chargeKind'>,
): boolean => {
  const isEssentialBill = vendor.chargeKind === TChargeKind.ESSENTIAL_BILL;
  const isExcludedCategory =
    vendor.category != null &&
    NON_SUBSCRIPTION_CATEGORIES.includes(vendor.category);

  return !isEssentialBill && !isExcludedCategory;
};
