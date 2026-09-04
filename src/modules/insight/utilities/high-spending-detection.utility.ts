import {
  LARGE_PURCHASE_RATIO,
  VENDOR_SPENDING_SPIKE_RATIO,
  MIN_TRANSACTIONS_FOR_BASELINE,
  MIN_VENDOR_HISTORY_FOR_SPIKE_CHECK,
} from '../constants/insight-threshold.constant';

import { ISpendingBaseline } from '@Modules/transaction/utilities/spending-baseline.utility';

export const isVendorSpendingSpike = (
  amount: string,
  baseline: ISpendingBaseline,
): boolean => {
  const hasEnoughHistory = baseline.count >= MIN_VENDOR_HISTORY_FOR_SPIKE_CHECK;

  return (
    hasEnoughHistory &&
    Number(amount) > baseline.average * VENDOR_SPENDING_SPIKE_RATIO
  );
};

export const isLargeOneOffPurchase = (
  amount: string,
  baseline: ISpendingBaseline,
): boolean => {
  const hasEnoughHistory = baseline.count >= MIN_TRANSACTIONS_FOR_BASELINE;

  return (
    hasEnoughHistory && Number(amount) > baseline.average * LARGE_PURCHASE_RATIO
  );
};
