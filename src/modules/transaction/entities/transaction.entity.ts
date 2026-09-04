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
  ITransaction,
  TCreateTransaction,
} from '../interfaces/transaction.interface';

import { Op } from 'sequelize';
import { DATA_LENGTHS } from '@Constants/data-length';
import { User } from '@Modules/user/entities/user.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { DEFAULT_CURRENCY, MONEY_PRECISION } from '@Constants/money';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';
import { StatementImport } from '@Modules/statement-import/entities/statement-import.entity';

@Table({
  tableName: 'transactions',
  paranoid: true,
  indexes: [
    {
      name: 'idx_transactions_external_id',
      unique: true,
      fields: ['user_id', 'external_id'],
      where: { external_id: { [Op.ne]: null }, deleted_at: null },
    },
    {
      name: 'idx_transactions_user_date',
      fields: ['user_id', 'transaction_date'],
    },
    {
      name: 'idx_transactions_user_subscription',
      fields: ['user_id', 'subscription_id'],
    },
    {
      name: 'idx_transactions_dedupe_lookup',
      fields: ['user_id', 'transaction_date', 'amount'],
    },
    { name: 'idx_transactions_import', fields: ['import_id'] },
  ],
})
export class Transaction
  extends Model<ITransaction, TCreateTransaction>
  implements ITransaction
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

  @AllowNull(true)
  @ForeignKey(() => Subscription)
  @Column({ type: DataType.UUID })
  declare subscriptionId: string | null;

  @AllowNull(true)
  @ForeignKey(() => StatementImport)
  @Column({ type: DataType.UUID })
  declare importId: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(DATA_LENGTHS.EXTERNAL_ID) })
  declare externalId: string | null;

  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.DESCRIPTION) })
  declare originalDescription: string;

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
  @Column({ type: DataType.DATEONLY })
  declare transactionDate: string;

  @BelongsTo(() => Vendor)
  declare vendor: Vendor;

  @BelongsTo(() => Subscription)
  declare subscription: Subscription;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @DeletedAt
  declare deletedAt: Date | null;
}
