import {
  Table,
  Model,
  Column,
  Default,
  DataType,
  BelongsTo,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  PrimaryKey,
} from 'sequelize-typescript';

import {
  IDraftAction,
  TCreateDraftAction,
} from '../interfaces/draft-action.interface';

import {
  TDraftActionType,
  DRAFT_ACTION_TYPE_VALUES,
} from '../constants/draft-action-type.constant';

import {
  TDraftActionStatus,
  DRAFT_ACTION_STATUS_VALUES,
} from '../constants/draft-action-status.constant';

import { DATA_LENGTHS } from '@Constants/data-length';
import { User } from '@Modules/user/entities/user.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { Insight } from '@Modules/insight/entities/insight.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

@Table({
  tableName: 'draft_actions',
  indexes: [
    { name: 'idx_draft_actions_user_status', fields: ['user_id', 'status'] },
    { unique: true, name: 'idx_draft_actions_insight', fields: ['insight_id'] },
  ],
})
export class DraftAction
  extends Model<IDraftAction, TCreateDraftAction>
  implements IDraftAction
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID })
  declare userId: string;

  @AllowNull(false)
  @ForeignKey(() => Insight)
  @Column({ type: DataType.UUID })
  declare insightId: string;

  @AllowNull(true)
  @ForeignKey(() => Subscription)
  @Column({ type: DataType.UUID })
  declare subscriptionId: string | null;

  @AllowNull(true)
  @ForeignKey(() => Vendor)
  @Column({ type: DataType.UUID })
  declare vendorId: string | null;

  @AllowNull(false)
  @Column({ type: DataType.ENUM, values: DRAFT_ACTION_TYPE_VALUES })
  declare actionType: TDraftActionType;

  @AllowNull(false)
  @Default(TDraftActionStatus.DRAFTED)
  @Column({ type: DataType.ENUM, values: DRAFT_ACTION_STATUS_VALUES })
  declare status: TDraftActionStatus;

  @AllowNull(true)
  @Column({ type: DataType.STRING(DATA_LENGTHS.EMAIL) })
  declare targetEmail: string | null;

  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.NAME) })
  declare subject: string;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  declare body: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare reasoning: string | null;

  @BelongsTo(() => Insight)
  declare insight: Insight;

  @BelongsTo(() => Subscription)
  declare subscription: Subscription;

  @BelongsTo(() => Vendor)
  declare vendor: Vendor;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
