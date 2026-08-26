export const DEFAULT_CURRENCY = 'ILS';

export const MONEY_PRECISION = {
  DIGITS: 12,
  DECIMALS: 2,
} as const;

export const MONEY_PATTERNS = {
  CURRENCY: '[A-Z]{3}',
  AMOUNT: '\\d{1,10}(\\.\\d{1,2})?',
} as const;

export const MONEY_REGEX = {
  CURRENCY: new RegExp(`^${MONEY_PATTERNS.CURRENCY}$`),
  AMOUNT: new RegExp(`^${MONEY_PATTERNS.AMOUNT}$`),
} as const;
