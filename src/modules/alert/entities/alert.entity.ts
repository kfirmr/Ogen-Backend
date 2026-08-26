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
  TAlertType,
  ALERT_TYPE_VALUES,
} from '../constants/alert-type.constant';

import {
  TAlertStatus,
  ALERT_STATUS_VALUES,
} from '../constants/alert-status.constant';

import { User } from '@Modules/user/entities/user.entity';
import { IAlert, TCreateAlert } from '../interfaces/alert.interface';
import { Transaction } from '@Modules/transaction/entities/transaction.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';

@Table({
  tableName: 'alerts',
  indexes: [
    { name: 'idx_alerts_user_status', fields: ['user_id', 'status'] },
    {
      name: 'idx_alerts_unread_dedupe',
      unique: true,
      fields: ['user_id', 'subscription_id', 'type'],
      where: { status: TAlertStatus.UNREAD },
    },
  ],
})
export class Alert extends Model<IAlert, TCreateAlert> implements IAlert {
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
  @Column({ type: DataType.ENUM, values: ALERT_TYPE_VALUES })
  declare type: TAlertType;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  declare body: string;

  @AllowNull(false)
  @Default(TAlertStatus.UNREAD)
  @Column({ type: DataType.ENUM, values: ALERT_STATUS_VALUES })
  declare status: TAlertStatus;

  @BelongsTo(() => Subscription)
  declare subscription: Subscription;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
