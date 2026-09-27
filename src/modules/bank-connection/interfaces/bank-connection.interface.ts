import { Optional } from 'sequelize';
import { TBankCompany } from '../constants/bank-company.constant';
import { TBankConnectionStatus } from '../constants/bank-connection-status.constant';

// Only non-secret fragments of the login, kept so the app can show which account is connected.
export interface IBankLoginHint {
  idLastDigits: string | null;
  cardLastDigits: string | null;
  usernamePrefix: string | null;
}

export interface IBankConnection {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  company: TBankCompany;
  lastError: string | null;
  lastSyncedAt: Date | null;
  otpRequestedAt: Date | null;
  encryptedCredentials: string;
  lastAttemptedAt: Date | null;
  status: TBankConnectionStatus;
  encryptedOtpCode: string | null;
  loginHint: IBankLoginHint | null;
}

export type TCreateBankConnection = Optional<
  IBankConnection,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'lastError'
  | 'lastSyncedAt'
  | 'otpRequestedAt'
  | 'lastAttemptedAt'
  | 'encryptedOtpCode'
  | 'loginHint'
>;

export type TBankConnectionSummary = Pick<
  IBankConnection,
  | 'id'
  | 'status'
  | 'company'
  | 'createdAt'
  | 'lastError'
  | 'loginHint'
  | 'lastSyncedAt'
  | 'otpRequestedAt'
>;

export interface IClaimedBankConnection {
  id: string;
  userId: string;
  startDate: Date;
  company: TBankCompany;
  encryptedCredentials: string;
}

export interface IPendingBankOtp {
  encryptedOtpCode: string | null;
}
