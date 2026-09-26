export enum TScrapedTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export const SCRAPED_TRANSACTION_STATUS_VALUES = Object.values(
  TScrapedTransactionStatus,
);

export const EXTERNAL_ID_SEPARATOR = ':';
