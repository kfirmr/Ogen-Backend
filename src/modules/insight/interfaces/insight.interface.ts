import { Optional } from 'sequelize';
import { TInsightType } from '../constants/insight-type.constant';
import { TInsightStatus } from '../constants/insight-status.constant';
import { ITransaction } from '@Modules/transaction/interfaces/transaction.interface';
import { ISubscription } from '@Modules/subscription/interfaces/subscription.interface';

export interface IInsight {
  id: string;
  body: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  type: TInsightType;
  status: TInsightStatus;
  transaction?: ITransaction;
  transactionId: string | null;
  subscription?: ISubscription;
  subscriptionId: string | null;
}

export type TCreateInsight = Optional<
  IInsight,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'subscriptionId'
  | 'transactionId'
>;
