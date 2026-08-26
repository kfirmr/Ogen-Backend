export enum TSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  CANCELLATION_REQUESTED = 'CANCELLATION_REQUESTED',
}

export const SUBSCRIPTION_STATUS_VALUES = Object.values(TSubscriptionStatus);
