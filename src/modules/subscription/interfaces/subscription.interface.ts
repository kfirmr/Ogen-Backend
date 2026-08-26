import { Optional } from 'sequelize';
import { TBillingCycle } from '../constants/billing-cycle.constant';
import { IVendor } from '@Modules/vendor/interfaces/vendor.interface';
import { TSubscriptionStatus } from '../constants/subscription-status.constant';

export interface ISubscription {
  id: string;
  userId: string;
  amount: string;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  vendor?: IVendor;
  deletedAt: Date | null;
  vendorId: string | null;
  cancelledAt: Date | null;
  status: TSubscriptionStatus;
  billingCycle: TBillingCycle;
  nextChargeDate: string | null;
  cancellationRequestedAt: Date | null;
}

export type TCreateSubscription = Optional<
  ISubscription,
  | 'id'
  | 'status'
  | 'currency'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'cancelledAt'
  | 'billingCycle'
  | 'cancellationRequestedAt'
>;
