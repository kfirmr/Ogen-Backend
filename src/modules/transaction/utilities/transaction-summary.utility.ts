import {
  ICategoryTotal,
  ICategorySpendRow,
  ISubscriptionCharge,
  ITransactionSummary,
  ISubscriptionChargeRow,
  ITransactionSummarySource,
} from '../interfaces/transaction.interface';

import { MONEY_PRECISION } from '@Constants/money';
import { ISubscription } from '@Modules/subscription/interfaces/subscription.interface';

interface IAmountRow {
  amount: string;
}

const toMoney = (amount: number): string =>
  amount.toFixed(MONEY_PRECISION.DECIMALS);

const sumAmounts = (rows: IAmountRow[]): number =>
  rows.reduce((sum, row) => sum + Number(row.amount), 0);

const byDescendingAmount = (first: IAmountRow, second: IAmountRow): number =>
  Number(second.amount) - Number(first.amount);

const toCategoryTotal = (row: ICategorySpendRow): ICategoryTotal => ({
  category: row.category,
  amount: toMoney(Number(row.amount)),
});

const sumNonSubscriptionAmounts = (rows: ICategorySpendRow[]): number =>
  rows.reduce((sum, row) => sum + Number(row.nonSubscriptionAmount), 0);

const toSubscriptionCharges = (
  chargeRows: ISubscriptionChargeRow[],
  subscriptionById: Map<string, ISubscription>,
): ISubscriptionCharge[] =>
  chargeRows.flatMap((row) => {
    const subscription = subscriptionById.get(row.subscriptionId) ?? null;

    if (subscription === null) {
      return [];
    }

    return [{ subscription, amount: toMoney(Number(row.amount)) }];
  });

// A charge whose subscription was since deleted is still money spent, so it counts as regular
// spend rather than vanishing from the month's total.
export const toTransactionSummary = (
  source: ITransactionSummarySource,
): ITransactionSummary => {
  const subscriptionById = new Map(
    source.subscriptions.map((subscription) => [subscription.id, subscription]),
  );
  const orphanedCharges = source.chargeRows.filter(
    (row) => !subscriptionById.has(row.subscriptionId),
  );
  const nonSubscriptionAmount =
    sumNonSubscriptionAmounts(source.categoryRows) +
    sumAmounts(orphanedCharges);

  return {
    nonSubscriptionAmount: toMoney(nonSubscriptionAmount),
    categories: source.categoryRows
      .map(toCategoryTotal)
      .sort(byDescendingAmount),
    subscriptionCharges: toSubscriptionCharges(
      source.chargeRows,
      subscriptionById,
    ).sort(byDescendingAmount),
  };
};
