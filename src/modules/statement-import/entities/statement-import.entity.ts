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

import { DATA_LENGTHS } from '@Constants/data-length';
import { User } from '@Modules/user/entities/user.entity';

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
  @Default(TImportSource.CSV)
  @Column({ type: DataType.ENUM, values: IMPORT_SOURCE_VALUES })
  declare source: TImportSource;

  @AllowNull(false)
  @Default(TImportStatus.PENDING)
  @Column({ type: DataType.ENUM, values: IMPORT_STATUS_VALUES })
  declare status: TImportStatus;

  @AllowNull(true)
  @Column({ type: DataType.STRING(DATA_LENGTHS.FILENAME) })
  declare filename: string | null;

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

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
