import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

export interface IRecurringCharge {
  amount: string;
  currency: string;
  transactionDate: string;
}

export interface IRecurrence {
  amount: string;
  currency: string;
  billingCycle: TBillingCycle;
}

export interface IBillingCycleWindow {
  expectedDays: number;
  toleranceDays: number;
}
