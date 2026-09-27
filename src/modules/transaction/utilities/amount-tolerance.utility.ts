import { MONEY_PRECISION } from '@Constants/money';
import { IAmountRange } from '../interfaces/recurrence.interface';
import { RECURRENCE_THRESHOLDS } from '../constants/recurrence-detection.constant';

const toMoney = (amount: number): string =>
  amount.toFixed(MONEY_PRECISION.DECIMALS);

// One tolerance decides both which charges prove a plan recurs and which charges belong to it, so
// a drink bought at the gym can never be counted as the membership.
export const isWithinAmountTolerance = (
  amount: string,
  anchorAmount: string,
): boolean =>
  Math.abs(Number(amount) - Number(anchorAmount)) <=
  Number(anchorAmount) * RECURRENCE_THRESHOLDS.AMOUNT_TOLERANCE_RATIO;

export const getAmountToleranceRange = (anchorAmount: string): IAmountRange => {
  const allowedDeviation =
    Number(anchorAmount) * RECURRENCE_THRESHOLDS.AMOUNT_TOLERANCE_RATIO;

  return {
    min: toMoney(Number(anchorAmount) - allowedDeviation),
    max: toMoney(Number(anchorAmount) + allowedDeviation),
  };
};
