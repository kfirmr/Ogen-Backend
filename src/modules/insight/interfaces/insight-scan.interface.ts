import { TServiceType } from '@Modules/vendor/constants/service-type.constant';

export interface IOverpayingLeakRow {
  amount: string;
  currency: string;
  vendorId: string;
  vendorName: string;
  subscriptionId: string;
  averageMarketPrice: string;
}

export interface IDuplicateLeakGroup {
  anchorAmount: string;
  vendorNames: string[];
  subscriptionIds: string[];
  serviceType: TServiceType;
  anchorSubscriptionId: string;
}

export interface ISpendingSpikeRow {
  amount: string;
  vendorId: string;
  vendorName: string;
  vendorCount: number;
  vendorAverage: string;
  transactionId: string;
}

export interface ILargePurchaseRow {
  amount: string;
  userCount: number;
  vendorName: string;
  userAverage: string;
  transactionId: string;
}
