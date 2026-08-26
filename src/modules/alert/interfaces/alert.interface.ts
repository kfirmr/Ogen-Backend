import { Optional } from 'sequelize';
import { TAlertType } from '../constants/alert-type.constant';
import { TAlertStatus } from '../constants/alert-status.constant';
import { ISubscription } from '@Modules/subscription/interfaces/subscription.interface';

export interface IAlert {
  id: string;
  body: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  type: TAlertType;
  status: TAlertStatus;
  transactionId: string | null;
  subscription?: ISubscription;
  subscriptionId: string | null;
}

export type TCreateAlert = Optional<
  IAlert,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'subscriptionId'
  | 'transactionId'
>;
