import {
  Table,
  Model,
  Column,
  Default,
  DataType,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  PrimaryKey,
} from 'sequelize-typescript';

import {
  TBankCompany,
  BANK_COMPANY_VALUES,
} from '../constants/bank-company.constant';

import {
  IBankConnection,
  TCreateBankConnection,
} from '../interfaces/bank-connection.interface';

import {
  TBankConnectionStatus,
  BANK_CONNECTION_STATUS_VALUES,
} from '../constants/bank-connection-status.constant';

import { User } from '@Modules/user/entities/user.entity';

@Table({
  tableName: 'bank_connections',
  indexes: [
    { name: 'idx_bank_connections_status', fields: ['status'] },
    {
      unique: true,
      name: 'idx_bank_connections_user_company',
      fields: ['user_id', 'company'],
    },
  ],
})
export class BankConnection
  extends Model<IBankConnection, TCreateBankConnection>
  implements IBankConnection
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
  @Column({ type: DataType.ENUM, values: BANK_COMPANY_VALUES })
  declare company: TBankCompany;

  @AllowNull(false)
  @Default(TBankConnectionStatus.PENDING_VALIDATION)
  @Column({ type: DataType.ENUM, values: BANK_CONNECTION_STATUS_VALUES })
  declare status: TBankConnectionStatus;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  declare encryptedCredentials: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare encryptedOtpCode: string | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare otpRequestedAt: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare lastAttemptedAt: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare lastSyncedAt: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare lastError: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
