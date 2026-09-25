import {
  IRecurrence,
  IEvidenceRule,
  IRecurringCharge,
  IBillingCycleWindow,
} from '../interfaces/recurrence.interface';

import {
  RECURRENCE_THRESHOLDS,
  BILLING_CYCLE_WINDOWS,
} from '../constants/recurrence-detection.constant';

import {
  TBillingCycle,
  BILLING_CYCLE_VALUES,
} from '@Modules/subscription/constants/billing-cycle.constant';

import { calculateDateDifference } from '@Utilities/date.utility';

const sortChronologically = (charges: IRecurringCharge[]): IRecurringCharge[] =>
  [...charges].sort((first, second) =>
    first.transactionDate.localeCompare(second.transactionDate),
  );

const getMedian = (values: number[]): number => {
  const sortedValues = [...values].sort((first, second) => first - second);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const isEvenLength = sortedValues.length % 2 === 0;

  if (isEvenLength) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex];
};

const isWithinAmountTolerance = (amount: string, anchorAmount: string) =>
  Math.abs(Number(amount) - Number(anchorAmount)) <=
  Number(anchorAmount) * RECURRENCE_THRESHOLDS.AMOUNT_TOLERANCE_RATIO;

// Incidental purchases at the same vendor (a drink at the gym) must not mask the plan's own
// charges, so the cadence is checked on the largest group of similarly-priced charges only.
const findLargestAmountGroup = (
  chronologicalCharges: IRecurringCharge[],
): IRecurringCharge[] =>
  chronologicalCharges
    .map((anchor) =>
      chronologicalCharges.filter((charge) =>
        isWithinAmountTolerance(charge.amount, anchor.amount),
      ),
    )
    .reduce<IRecurringCharge[]>(
      (largestGroup, group) =>
        group.length >= largestGroup.length ? group : largestGroup,
      [],
    );

const hasStableAmount = (charges: IRecurringCharge[]): boolean => {
  const amounts = charges.map((charge) => Number(charge.amount));
  const medianAmount = getMedian(amounts);
  const allowedDeviation =
    medianAmount * RECURRENCE_THRESHOLDS.AMOUNT_TOLERANCE_RATIO;

  return amounts.every(
    (amount) => Math.abs(amount - medianAmount) <= allowedDeviation,
  );
};

const hasIdenticalAmount = (charges: IRecurringCharge[]): boolean =>
  charges.every(
    (charge) => Number(charge.amount) === Number(charges[0].amount),
  );

const resolveEvidenceRule = (
  group: IRecurringCharge[],
  requiredCharges: number,
): IEvidenceRule => {
  const { IDENTICAL_AMOUNT } = RECURRENCE_THRESHOLDS;
  const isShortOfRequiredCharges = group.length < requiredCharges;

  if (isShortOfRequiredCharges && hasIdenticalAmount(group)) {
    return {
      requiredCharges: IDENTICAL_AMOUNT.REQUIRED_CHARGES,
      maxToleranceDays: IDENTICAL_AMOUNT.MAX_TOLERANCE_DAYS,
    };
  }

  return { requiredCharges, maxToleranceDays: Number.POSITIVE_INFINITY };
};

const getGapsInDays = (chronologicalCharges: IRecurringCharge[]): number[] =>
  chronologicalCharges
    .slice(1)
    .map((charge, index) =>
      calculateDateDifference(
        new Date(chronologicalCharges[index].transactionDate),
        new Date(charge.transactionDate),
      ),
    );

const isWithinWindow = (
  gapInDays: number,
  window: IBillingCycleWindow,
  maxToleranceDays: number,
) =>
  Math.abs(gapInDays - window.expectedDays) <=
  Math.min(window.toleranceDays, maxToleranceDays);

const hasConsistentGaps = (
  gapsInDays: number[],
  window: IBillingCycleWindow,
): boolean => {
  const gapSpread = Math.max(...gapsInDays) - Math.min(...gapsInDays);

  return gapSpread <= window.maxGapSpreadDays;
};

const fitsBillingCycle = (
  gapsInDays: number[],
  window: IBillingCycleWindow,
  maxToleranceDays: number,
): boolean => {
  const isEveryGapInWindow = gapsInDays.every((gapInDays) =>
    isWithinWindow(gapInDays, window, maxToleranceDays),
  );

  return isEveryGapInWindow && hasConsistentGaps(gapsInDays, window);
};

const matchBillingCycle = (
  gapsInDays: number[],
  maxToleranceDays: number,
): TBillingCycle | null =>
  BILLING_CYCLE_VALUES.find((billingCycle) =>
    fitsBillingCycle(
      gapsInDays,
      BILLING_CYCLE_WINDOWS[billingCycle],
      maxToleranceDays,
    ),
  ) ?? null;

// A vendor only counts as recurring for a user when their own charges prove it: enough charges,
// at a steady amount, spaced at a steady interval matching a known billing cycle.
export const detectRecurrence = (
  charges: IRecurringCharge[],
  requiredCharges: number,
): IRecurrence | null => {
  const group = findLargestAmountGroup(sortChronologically(charges));
  const evidenceRule = resolveEvidenceRule(group, requiredCharges);
  const minimumCharges = Math.max(
    evidenceRule.requiredCharges,
    RECURRENCE_THRESHOLDS.MIN_CHARGES_FOR_CADENCE,
  );

  if (group.length < minimumCharges) {
    return null;
  }

  if (!hasStableAmount(group)) {
    return null;
  }

  const billingCycle = matchBillingCycle(
    getGapsInDays(group),
    evidenceRule.maxToleranceDays,
  );

  if (billingCycle == null) {
    return null;
  }

  const latestCharge = group[group.length - 1];

  return {
    billingCycle,
    amount: latestCharge.amount,
    currency: latestCharge.currency,
  };
};
