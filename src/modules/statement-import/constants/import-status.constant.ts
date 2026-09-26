export enum TImportStatus {
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  PROCESSING = 'PROCESSING',
}

export const IMPORT_STATUS_VALUES = Object.values(TImportStatus);

export const TERMINAL_IMPORT_STATUSES = [
  TImportStatus.FAILED,
  TImportStatus.COMPLETED,
];
