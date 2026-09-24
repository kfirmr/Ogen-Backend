import { TIME_UNITS } from '@Constants/date';
import { IBillingCycleWindow } from '../interfaces/recurrence.interface';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

const DAYS_PER_WEEK = TIME_UNITS.WEEKS / TIME_UNITS.DAYS;
const DAYS_PER_MONTH = TIME_UNITS.MONTHS / TIME_UNITS.DAYS;
const DAYS_PER_YEAR = TIME_UNITS.YEARS / TIME_UNITS.DAYS;

export const RECURRENCE_THRESHOLDS = {
  MIN_CHARGES: 3,
  AMOUNT_TOLERANCE_RATIO: 0.15,
} as const;

// Tolerances absorb 28-31 day months and banks shifting a charge around weekends and holidays.
export const BILLING_CYCLE_WINDOWS: Record<TBillingCycle, IBillingCycleWindow> =
  {
    [TBillingCycle.WEEKLY]: { expectedDays: DAYS_PER_WEEK, toleranceDays: 2 },
    [TBillingCycle.MONTHLY]: { expectedDays: DAYS_PER_MONTH, toleranceDays: 5 },
    [TBillingCycle.QUARTERLY]: {
      expectedDays: 3 * DAYS_PER_MONTH,
      toleranceDays: 10,
    },
    [TBillingCycle.YEARLY]: { expectedDays: DAYS_PER_YEAR, toleranceDays: 15 },
  };
