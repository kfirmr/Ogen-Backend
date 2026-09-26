import { Optional } from 'sequelize';
import { TBankCompany } from '../constants/bank-company.constant';
import { TBankConnectionStatus } from '../constants/bank-connection-status.constant';

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
>;

export type TBankConnectionSummary = Pick<
  IBankConnection,
  | 'id'
  | 'status'
  | 'company'
  | 'createdAt'
  | 'lastError'
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
