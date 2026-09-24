import { Optional } from 'sequelize';
import { IVendor } from '@Modules/vendor/interfaces/vendor.interface';
import { IInsight } from '@Modules/insight/interfaces/insight.interface';
import { TDraftActionType } from '../constants/draft-action-type.constant';
import { TDraftActionStatus } from '../constants/draft-action-status.constant';
import { ISubscription } from '@Modules/subscription/interfaces/subscription.interface';

export interface IDraftAction {
  id: string;
  body: string;
  userId: string;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
  vendor?: IVendor;
  insightId: string;
  insight?: IInsight;
  vendorId: string | null;
  reasoning: string | null;
  targetEmail: string | null;
  status: TDraftActionStatus;
  actionType: TDraftActionType;
  subscription?: ISubscription;
  subscriptionId: string | null;
}

export type TCreateDraftAction = Optional<
  IDraftAction,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'vendorId'
  | 'reasoning'
  | 'targetEmail'
  | 'subscriptionId'
>;
