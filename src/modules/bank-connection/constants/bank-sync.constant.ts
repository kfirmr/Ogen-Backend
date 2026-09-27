import { TIME_UNITS } from '@Constants/date';
import { TBankConnectionStatus } from './bank-connection-status.constant';

export enum TBankSyncScope {
  SCHEDULED = 'SCHEDULED',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
}

export enum TBankSyncFailure {
  UNKNOWN = 'UNKNOWN',
  OTP_TIMEOUT = 'OTP_TIMEOUT',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}

// A first sync reads a full year: the furthest most scrapers reach (Isracard, Amex and the banks
// clamp there), and enough history for yearly subscriptions and spending baselines to show up.
export const BANK_SYNC_WINDOWS = {
  INITIAL_HISTORY_MS: TIME_UNITS.YEARS,
  RESYNC_OVERLAP_MS: TIME_UNITS.WEEKS,
  MIN_SYNC_INTERVAL_MS: 20 * TIME_UNITS.HOURS,
  STALE_CLAIM_MS: TIME_UNITS.HOURS,
  OTP_TTL_MS: 10 * TIME_UNITS.MINUTES,
} as const;

export const OTP_CODE_PATTERN = /^\d{4,8}$/;

// A rejected login cannot fix itself, so it waits for the user to re-enter credentials instead
// of being retried every night and risking a bank lockout.
export const BANK_CONNECTION_STATUS_BY_FAILURE: Record<
  TBankSyncFailure,
  TBankConnectionStatus
> = {
  [TBankSyncFailure.UNKNOWN]: TBankConnectionStatus.FAILED,
  [TBankSyncFailure.OTP_TIMEOUT]: TBankConnectionStatus.FAILED,
  [TBankSyncFailure.ACCOUNT_BLOCKED]: TBankConnectionStatus.INVALID_CREDENTIALS,
  [TBankSyncFailure.INVALID_CREDENTIALS]:
    TBankConnectionStatus.INVALID_CREDENTIALS,
};
