import { TSubscriptionPrice } from '@Modules/subscription/interfaces/subscription.interface';
import { isWithinAmountTolerance } from '@Modules/transaction/utilities/amount-tolerance.utility';

// A charge from a subscribed vendor is the plan's billing only when it is at the plan's price.
export const resolveChargedSubscriptionId = (
  amount: string,
  vendorSubscription: TSubscriptionPrice | null,
): string | null => {
  if (vendorSubscription === null) {
    return null;
  }

  if (!isWithinAmountTolerance(amount, vendorSubscription.amount)) {
    return null;
  }

  return vendorSubscription.id;
};
