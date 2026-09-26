import {
  IBankConnection,
  TBankConnectionSummary,
  IClaimedBankConnection,
} from '../interfaces/bank-connection.interface';

import { BANK_SYNC_WINDOWS } from '../constants/bank-sync.constant';

export const toBankConnectionSummary = (
  connection: IBankConnection,
): TBankConnectionSummary => ({
  id: connection.id,
  status: connection.status,
  company: connection.company,
  createdAt: connection.createdAt,
  lastError: connection.lastError,
  lastSyncedAt: connection.lastSyncedAt,
  otpRequestedAt: connection.otpRequestedAt,
});

// Re-reading a week that was already imported is cheap (dedupe drops it) and catches charges
// the bank posted late with an earlier purchase date.
const resolveSyncStartDate = (connection: IBankConnection, now: Date): Date => {
  if (connection.lastSyncedAt === null) {
    return new Date(now.getTime() - BANK_SYNC_WINDOWS.INITIAL_HISTORY_MS);
  }

  return new Date(
    connection.lastSyncedAt.getTime() - BANK_SYNC_WINDOWS.RESYNC_OVERLAP_MS,
  );
};

export const toClaimedBankConnection = (
  connection: IBankConnection,
  now: Date,
): IClaimedBankConnection => ({
  id: connection.id,
  userId: connection.userId,
  company: connection.company,
  encryptedCredentials: connection.encryptedCredentials,
  startDate: resolveSyncStartDate(connection, now),
});

export const isOtpExpired = (
  connection: IBankConnection,
  now: Date,
): boolean => {
  if (connection.otpRequestedAt === null) {
    return true;
  }

  const otpAgeMs = now.getTime() - connection.otpRequestedAt.getTime();

  return otpAgeMs > BANK_SYNC_WINDOWS.OTP_TTL_MS;
};
