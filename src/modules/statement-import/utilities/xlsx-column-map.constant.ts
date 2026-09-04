export enum TStatementColumnField {
  DATE = 'DATE',
  AMOUNT = 'AMOUNT',
  CURRENCY = 'CURRENCY',
  DESCRIPTION = 'DESCRIPTION',
  EXTERNAL_ID = 'EXTERNAL_ID',
}

// Canonical headers from a real Israeli credit-card statement export. AMOUNT/CURRENCY map to the
// billed columns (סכום חיוב / מטבע חיוב), not the transaction-currency ones (סכום עסקה / מטבע עסקה) —
// the billed amount is what actually affects the user's spend.
export const STATEMENT_COLUMN_HEADERS: Record<TStatementColumnField, string> = {
  [TStatementColumnField.DATE]: 'תאריך רכישה',
  [TStatementColumnField.DESCRIPTION]: 'שם בית עסק',
  [TStatementColumnField.AMOUNT]: 'סכום חיוב',
  [TStatementColumnField.CURRENCY]: 'מטבע חיוב',
  [TStatementColumnField.EXTERNAL_ID]: "מס' שובר",
};

export const REQUIRED_STATEMENT_COLUMN_FIELDS: TStatementColumnField[] = [
  TStatementColumnField.DATE,
  TStatementColumnField.DESCRIPTION,
  TStatementColumnField.AMOUNT,
  TStatementColumnField.CURRENCY,
];
