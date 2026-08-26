import { Optional } from 'sequelize';
import { IVendor } from '@Modules/vendor/interfaces/vendor.interface';
import { ISubscription } from '@Modules/subscription/interfaces/subscription.interface';

export interface ITransaction {
  id: string;
  userId: string;
  amount: string;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  vendor?: IVendor;
  deletedAt: Date | null;
  transactionDate: string;
  vendorId: string | null;
  importId: string | null;
  externalId: string | null;
  originalDescription: string;
  subscription?: ISubscription;
  subscriptionId: string | null;
}

export type TCreateTransaction = Optional<
  ITransaction,
  | 'id'
  | 'currency'
  | 'vendorId'
  | 'importId'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'externalId'
  | 'subscriptionId'
>;
