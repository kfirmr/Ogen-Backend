import {
  Table,
  Model,
  Column,
  Default,
  DataType,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
} from 'sequelize-typescript';

import { DATA_LENGTHS } from '@Constants/data-length';
import { ILevel, TCreateLevel } from '../interfaces/level.interface';

@Table({
  tableName: 'levels',
  indexes: [
    { name: 'idx_levels_level_number', unique: true, fields: ['level_number'] },
    { name: 'idx_levels_xp_required', fields: ['xp_required'] },
  ],
})
export class Level extends Model<ILevel, TCreateLevel> implements ILevel {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  declare levelNumber: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  declare xpRequired: number;

  @AllowNull(false)
  @Column({ type: DataType.STRING(DATA_LENGTHS.NAME) })
  declare title: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
