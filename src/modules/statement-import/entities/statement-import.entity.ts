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
  TImportSource,
  IMPORT_SOURCE_VALUES,
} from '../constants/import-source.constant';

import {
  TImportStatus,
  IMPORT_STATUS_VALUES,
} from '../constants/import-status.constant';

import {
  IStatementImport,
  TCreateStatementImport,
} from '../interfaces/statement-import.interface';

import { User } from '@Modules/user/entities/user.entity';
import { BankConnection } from '@Modules/bank-connection/entities/bank-connection.entity';

@Table({
  tableName: 'statement_imports',
  indexes: [
    {
      name: 'idx_statement_imports_user_created',
      fields: ['user_id', 'created_at'],
    },
  ],
})
export class StatementImport
  extends Model<IStatementImport, TCreateStatementImport>
  implements IStatementImport
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
  @Default(TImportSource.BANK_API)
  @Column({ type: DataType.ENUM, values: IMPORT_SOURCE_VALUES })
  declare source: TImportSource;

  @AllowNull(false)
  @Default(TImportStatus.PROCESSING)
  @Column({ type: DataType.ENUM, values: IMPORT_STATUS_VALUES })
  declare status: TImportStatus;

  @AllowNull(false)
  @Default(0)
  @Column({ type: DataType.INTEGER })
  declare transactionCount: number;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare errorMessage: string | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare completedAt: Date | null;

  @AllowNull(true)
  @ForeignKey(() => BankConnection)
  @Column({ type: DataType.UUID })
  declare bankConnectionId: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
