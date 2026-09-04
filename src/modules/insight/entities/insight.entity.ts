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
  TInsightType,
  INSIGHT_TYPE_VALUES,
} from '../constants/insight-type.constant';

import {
  TInsightStatus,
  INSIGHT_STATUS_VALUES,
} from '../constants/insight-status.constant';

import { User } from '@Modules/user/entities/user.entity';
import { IInsight, TCreateInsight } from '../interfaces/insight.interface';
import { Transaction } from '@Modules/transaction/entities/transaction.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

@Table({
  tableName: 'insights',
  indexes: [
    { name: 'idx_insights_user_status', fields: ['user_id', 'status'] },
    {
      name: 'idx_insights_unread_dedupe',
      unique: true,
      fields: ['user_id', 'subscription_id', 'type'],
      where: { status: TInsightStatus.UNREAD },
    },
  ],
})
export class Insight
  extends Model<IInsight, TCreateInsight>
  implements IInsight
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID })
  declare userId: string;

  @AllowNull(true)
  @ForeignKey(() => Subscription)
  @Column({ type: DataType.UUID })
  declare subscriptionId: string | null;

  @AllowNull(true)
  @ForeignKey(() => Transaction)
  @Column({ type: DataType.UUID })
  declare transactionId: string | null;

  @AllowNull(false)
  @Column({ type: DataType.ENUM, values: INSIGHT_TYPE_VALUES })
  declare type: TInsightType;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  declare body: string;

  @AllowNull(false)
  @Default(TInsightStatus.UNREAD)
  @Column({ type: DataType.ENUM, values: INSIGHT_STATUS_VALUES })
  declare status: TInsightStatus;

  @BelongsTo(() => Subscription)
  declare subscription: Subscription;

  @BelongsTo(() => Transaction)
  declare transaction: Transaction;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
