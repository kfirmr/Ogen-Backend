import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

export interface IRedundantServiceGroup {
  vendorNames: string[];
  subscriptionIds: string[];
  anchorSubscriptionId: string;
}

const compareByCreationOrder = (
  first: Subscription,
  second: Subscription,
): number => {
  const creationGap = first.createdAt.getTime() - second.createdAt.getTime();

  if (creationGap !== 0) {
    return creationGap;
  }

  return first.id.localeCompare(second.id);
};

const getDistinctVendorNames = (subscriptions: Subscription[]): string[] => {
  const names = subscriptions.flatMap((subscription) => {
    if (subscription.vendor == null) {
      return [];
    }

    return [subscription.vendor.name];
  });

  return [...new Set(names)];
};

export const isRedundantServiceType = (
  serviceType?: TServiceType | null,
): serviceType is TServiceType => {
  if (serviceType == null) {
    return false;
  }

  return serviceType !== TServiceType.NONE;
};

export const buildRedundantServiceGroup = (
  subscriptions: Subscription[],
): IRedundantServiceGroup | null => {
  const hasRedundancy = subscriptions.length > 1;

  if (!hasRedundancy) {
    return null;
  }

  const orderedSubscriptions = [...subscriptions].sort(compareByCreationOrder);

  return {
    vendorNames: getDistinctVendorNames(orderedSubscriptions),
    subscriptionIds: orderedSubscriptions.map(
      (subscription) => subscription.id,
    ),
    anchorSubscriptionId: orderedSubscriptions[0].id,
  };
};
