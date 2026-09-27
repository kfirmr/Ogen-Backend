import { Optional } from 'sequelize';
import { IVendor } from '@Modules/vendor/interfaces/vendor.interface';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
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

export type TCreateTransactionForImport = Pick<
  TCreateTransaction,
  | 'amount'
  | 'currency'
  | 'vendorId'
  | 'importId'
  | 'externalId'
  | 'subscriptionId'
  | 'transactionDate'
  | 'originalDescription'
>;

export interface ICategoryTotal {
  amount: string;
  category: TVendorCategory | null;
}

export interface ICategorySpendRow extends ICategoryTotal {
  nonSubscriptionAmount: string;
}

export interface ISubscriptionChargeRow {
  amount: string;
  subscriptionId: string;
}

export interface ISubscriptionCharge {
  amount: string;
  subscription: ISubscription;
}

export interface ITransactionSummary {
  categories: ICategoryTotal[];
  nonSubscriptionAmount: string;
  subscriptionCharges: ISubscriptionCharge[];
}

export interface ITransactionSummarySource {
  subscriptions: ISubscription[];
  categoryRows: ICategorySpendRow[];
  chargeRows: ISubscriptionChargeRow[];
}
