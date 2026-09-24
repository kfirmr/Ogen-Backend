import {
  IRecurrence,
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

const hasStableAmount = (charges: IRecurringCharge[]): boolean => {
  const amounts = charges.map((charge) => Number(charge.amount));
  const medianAmount = getMedian(amounts);
  const allowedDeviation =
    medianAmount * RECURRENCE_THRESHOLDS.AMOUNT_TOLERANCE_RATIO;

  return amounts.every(
    (amount) => Math.abs(amount - medianAmount) <= allowedDeviation,
  );
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

const isWithinWindow = (gapInDays: number, window: IBillingCycleWindow) =>
  Math.abs(gapInDays - window.expectedDays) <= window.toleranceDays;

const matchBillingCycle = (gapsInDays: number[]): TBillingCycle | null =>
  BILLING_CYCLE_VALUES.find((billingCycle) =>
    gapsInDays.every((gapInDays) =>
      isWithinWindow(gapInDays, BILLING_CYCLE_WINDOWS[billingCycle]),
    ),
  ) ?? null;

// A vendor only counts as recurring for a user when their own charges prove it: enough charges,
// at a steady amount, spaced at a steady interval matching a known billing cycle.
export const detectRecurrence = (
  charges: IRecurringCharge[],
): IRecurrence | null => {
  if (charges.length < RECURRENCE_THRESHOLDS.MIN_CHARGES) {
    return null;
  }

  const chronologicalCharges = sortChronologically(charges);

  if (!hasStableAmount(chronologicalCharges)) {
    return null;
  }

  const billingCycle = matchBillingCycle(getGapsInDays(chronologicalCharges));

  if (billingCycle == null) {
    return null;
  }

  const latestCharge = chronologicalCharges[chronologicalCharges.length - 1];

  return {
    billingCycle,
    amount: latestCharge.amount,
    currency: latestCharge.currency,
  };
};
