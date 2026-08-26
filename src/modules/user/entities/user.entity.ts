import {
  Table,
  Model,
  Column,
  Default,
  DataType,
  AllowNull,
  CreatedAt,
  DeletedAt,
  UpdatedAt,
  PrimaryKey,
} from 'sequelize-typescript';

import { DATA_LENGTHS } from '@Constants/data-length';
import { IUser, TCreateUser } from '../interfaces/user.interface';

@Table({
  tableName: 'users',
  paranoid: true,
  defaultScope: { attributes: { exclude: ['passwordHash'] } },
  indexes: [
    {
      name: 'idx_users_email',
      unique: true,
      fields: ['email'],
      where: { deleted_at: null },
    },
    { name: 'idx_users_deleted_at', fields: ['deleted_at'] },
  ],
})
export class User extends Model<IUser, TCreateUser> implements IUser {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.EMAIL) })
  declare email: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.PASSWORD_HASH) })
  declare passwordHash: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.NAME) })
  declare fullName: string;

  @AllowNull(false)
  @Default(0)
  @Column({ type: DataType.INTEGER })
  declare totalXp: number;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @DeletedAt
  declare deletedAt: Date | null;
}
