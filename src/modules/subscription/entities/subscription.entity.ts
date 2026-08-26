import {
  Table,
  Model,
  Column,
  Default,
  DataType,
  BelongsTo,
  AllowNull,
  CreatedAt,
  DeletedAt,
  UpdatedAt,
  ForeignKey,
  PrimaryKey,
} from 'sequelize-typescript';

import {
  TBillingCycle,
  BILLING_CYCLE_VALUES,
} from '../constants/billing-cycle.constant';

import {
  ISubscription,
  TCreateSubscription,
} from '../interfaces/subscription.interface';

import {
  TSubscriptionStatus,
  SUBSCRIPTION_STATUS_VALUES,
} from '../constants/subscription-status.constant';

import { DATA_LENGTHS } from '@Constants/data-length';
import { User } from '@Modules/user/entities/user.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { DEFAULT_CURRENCY, MONEY_PRECISION } from '@Constants/money';

@Table({
  tableName: 'subscriptions',
  paranoid: true,
  indexes: [
    { name: 'idx_subscriptions_user_status', fields: ['user_id', 'status'] },
    { name: 'idx_subscriptions_vendor', fields: ['vendor_id'] },
  ],
})
export class Subscription
  extends Model<ISubscription, TCreateSubscription>
  implements ISubscription
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
  @ForeignKey(() => Vendor)
  @Column({ type: DataType.UUID })
  declare vendorId: string | null;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(MONEY_PRECISION.DIGITS, MONEY_PRECISION.DECIMALS),
  })
  declare amount: string;

  @AllowNull(false)
  @Default(DEFAULT_CURRENCY)
  @Column({ type: DataType.CHAR(DATA_LENGTHS.CURRENCY) })
  declare currency: string;

  @AllowNull(false)
  @Default(TBillingCycle.MONTHLY)
  @Column({ type: DataType.ENUM, values: BILLING_CYCLE_VALUES })
  declare billingCycle: TBillingCycle;

  @AllowNull(false)
  @Default(TSubscriptionStatus.ACTIVE)
  @Column({ type: DataType.ENUM, values: SUBSCRIPTION_STATUS_VALUES })
  declare status: TSubscriptionStatus;

  @AllowNull(true)
  @Column({ type: DataType.DATEONLY })
  declare nextChargeDate: string | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare cancellationRequestedAt: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare cancelledAt: Date | null;

  @BelongsTo(() => Vendor)
  declare vendor: Vendor;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @DeletedAt
  declare deletedAt: Date | null;
}
