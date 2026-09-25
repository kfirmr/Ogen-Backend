export enum TBillingCycle {
  WEEKLY = 'WEEKLY',
  YEARLY = 'YEARLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}

export const BILLING_CYCLE_VALUES = Object.values(TBillingCycle);

export const DEFAULT_BILLING_CYCLE = TBillingCycle.MONTHLY;
