import { DEFAULT_CURRENCY } from '@Constants/money';
import { IVendor } from '@Modules/vendor/interfaces/vendor.interface';
import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { IRecurringCharge } from '@Modules/transaction/interfaces/recurrence.interface';
import { TCreateTransactionForImport } from '@Modules/transaction/interfaces/transaction.interface';
import { RECURRENCE_THRESHOLDS } from '@Modules/transaction/constants/recurrence-detection.constant';

export const getRequiredChargeCount = (
  vendor: Pick<IVendor, 'chargeKind'>,
): number => {
  if (vendor.chargeKind === TChargeKind.SUBSCRIPTION) {
    return RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.AI_FLAGGED;
  }

  return RECURRENCE_THRESHOLDS.REQUIRED_CHARGES.UNFLAGGED;
};

export const pickLatestCharge = (
  current: IRecurringCharge | null,
  next: IRecurringCharge,
): IRecurringCharge => {
  if (current == null) {
    return next;
  }

  const isNextLater = next.transactionDate > current.transactionDate;

  return isNextLater ? next : current;
};

export const toRecurringCharge = (
  data: TCreateTransactionForImport,
): IRecurringCharge => ({
  amount: data.amount,
  transactionDate: data.transactionDate,
  currency: data.currency ?? DEFAULT_CURRENCY,
});
