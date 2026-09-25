import { TIME_UNITS } from '@Constants/date';
import { IBillingCycleWindow } from '../interfaces/recurrence.interface';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

const DAYS_PER_WEEK = TIME_UNITS.WEEKS / TIME_UNITS.DAYS;
const DAYS_PER_MONTH = TIME_UNITS.MONTHS / TIME_UNITS.DAYS;
const DAYS_PER_YEAR = TIME_UNITS.YEARS / TIME_UNITS.DAYS;

// An AI SUBSCRIPTION guess, or two charges of the exact same amount, lower the evidence bar to one
// full cycle but never replace it; a cadence needs at least two charges to exist at all. The
// identical-amount shortcut also demands a tight billing day, so a habit like a monthly haircut
// (same price, drifting date) is not mistaken for a plan.
export const RECURRENCE_THRESHOLDS = {
  AMOUNT_TOLERANCE_RATIO: 0.15,
  MIN_CHARGES_FOR_CADENCE: 2,
  REQUIRED_CHARGES: {
    AI_FLAGGED: 2,
    UNFLAGGED: 3,
  },
  IDENTICAL_AMOUNT: {
    REQUIRED_CHARGES: 2,
    MAX_TOLERANCE_DAYS: 3,
  },
} as const;

// Tolerances absorb 28-31 day months and banks shifting a charge around weekends and holidays.
// The gap spread catches a habit that happens to average one cycle (a haircut every 26 then 35
// days), since a plan billed on a fixed day only drifts by month length and weekend shifts.
export const BILLING_CYCLE_WINDOWS: Record<TBillingCycle, IBillingCycleWindow> =
  {
    [TBillingCycle.WEEKLY]: {
      expectedDays: DAYS_PER_WEEK,
      toleranceDays: 2,
      maxGapSpreadDays: 4,
    },
    [TBillingCycle.MONTHLY]: {
      expectedDays: DAYS_PER_MONTH,
      toleranceDays: 5,
      maxGapSpreadDays: 6,
    },
    [TBillingCycle.QUARTERLY]: {
      expectedDays: 3 * DAYS_PER_MONTH,
      toleranceDays: 10,
      maxGapSpreadDays: 10,
    },
    [TBillingCycle.YEARLY]: {
      expectedDays: DAYS_PER_YEAR,
      toleranceDays: 15,
      maxGapSpreadDays: 14,
    },
  };
