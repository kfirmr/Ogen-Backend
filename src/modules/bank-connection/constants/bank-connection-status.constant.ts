export enum TBankConnectionStatus {
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  SYNCING = 'SYNCING',
  AWAITING_OTP = 'AWAITING_OTP',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}

export const BANK_CONNECTION_STATUS_VALUES = Object.values(
  TBankConnectionStatus,
);

export const IN_FLIGHT_BANK_CONNECTION_STATUSES = [
  TBankConnectionStatus.SYNCING,
  TBankConnectionStatus.AWAITING_OTP,
];

export const SCHEDULABLE_BANK_CONNECTION_STATUSES = [
  TBankConnectionStatus.ACTIVE,
  TBankConnectionStatus.FAILED,
];
