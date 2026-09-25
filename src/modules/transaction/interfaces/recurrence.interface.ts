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

export interface IRecurrenceRequest {
  vendorId: string;
  requiredCharges: number;
}

export interface IEvidenceRule {
  requiredCharges: number;
  maxToleranceDays: number;
}

export interface IBillingCycleWindow {
  expectedDays: number;
  toleranceDays: number;
  maxGapSpreadDays: number;
}
