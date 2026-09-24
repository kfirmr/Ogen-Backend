import { Optional } from 'sequelize';
import { TInsightType } from '../constants/insight-type.constant';
import { TInsightStatus } from '../constants/insight-status.constant';
import { ITransaction } from '@Modules/transaction/interfaces/transaction.interface';
import { ISubscription } from '@Modules/subscription/interfaces/subscription.interface';

// Structured detection facts (vendor, amounts, sibling subscription ids); aliased instead of
// an inline Record<...> since its comma confuses the pyramid-interface-keys formatter plugin.
export type TInsightMetadata = Record<string, unknown>;

export interface IInsight {
  id: string;
  body: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  type: TInsightType;
  status: TInsightStatus;
  transaction?: ITransaction;
  metadata: TInsightMetadata;
  transactionId: string | null;
  subscription?: ISubscription;
  subscriptionId: string | null;
  estimatedMonthlySavings: string | null;
}

export type TCreateInsight = Optional<
  IInsight,
  | 'id'
  | 'status'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
  | 'subscriptionId'
  | 'transactionId'
  | 'estimatedMonthlySavings'
>;
