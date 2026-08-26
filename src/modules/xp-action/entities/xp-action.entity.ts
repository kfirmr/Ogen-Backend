import {
  Table,
  Model,
  Unique,
  Column,
  Default,
  DataType,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
} from 'sequelize-typescript';

import { DATA_LENGTHS } from '@Constants/data-length';
import { IXpAction, TCreateXpAction } from '../interfaces/xp-action.interface';

@Table({ tableName: 'xp_actions' })
export class XpAction
  extends Model<IXpAction, TCreateXpAction>
  implements IXpAction
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.NAME) })
  declare key: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  declare xpValue: number;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  declare description: string;

  @AllowNull(false)
  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  declare isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
