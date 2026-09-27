import {
  ICategoryTotal,
  ICategorySpendRow,
  ITransactionSummary,
} from '../interfaces/transaction.interface';

import { MONEY_PRECISION } from '@Constants/money';

const toMoney = (amount: number): string =>
  amount.toFixed(MONEY_PRECISION.DECIMALS);

const byDescendingAmount = (
  first: ICategoryTotal,
  second: ICategoryTotal,
): number => Number(second.amount) - Number(first.amount);

const toCategoryTotal = (row: ICategorySpendRow): ICategoryTotal => ({
  category: row.category,
  amount: toMoney(Number(row.amount)),
});

const sumNonSubscriptionAmounts = (rows: ICategorySpendRow[]): number =>
  rows.reduce((sum, row) => sum + Number(row.nonSubscriptionAmount), 0);

export const toTransactionSummary = (
  rows: ICategorySpendRow[],
): ITransactionSummary => ({
  categories: rows.map(toCategoryTotal).sort(byDescendingAmount),
  nonSubscriptionAmount: toMoney(sumNonSubscriptionAmounts(rows)),
});
