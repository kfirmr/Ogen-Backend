import { MONEY_PRECISION } from '@Constants/money';

// Amounts are normalized so a parsed "69.9" and a stored "69.90" produce the same key.
export const buildDedupeKey = (
  transactionDate: string,
  amount: string,
): string =>
  `${transactionDate}|${Number(amount).toFixed(MONEY_PRECISION.DECIMALS)}`;
