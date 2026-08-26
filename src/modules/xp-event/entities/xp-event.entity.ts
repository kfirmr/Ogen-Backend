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

import { User } from '@Modules/user/entities/user.entity';
import { XpAction } from '@Modules/xp-action/entities/xp-action.entity';
import { IXpEvent, TCreateXpEvent } from '../interfaces/xp-event.interface';

@Table({
  tableName: 'xp_events',
  indexes: [
    { name: 'idx_xp_events_user_created', fields: ['user_id', 'created_at'] },
    { name: 'idx_xp_events_action', fields: ['xp_action_id'] },
  ],
})
export class XpEvent
  extends Model<IXpEvent, TCreateXpEvent>
  implements IXpEvent
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
  @ForeignKey(() => XpAction)
  @Column({ type: DataType.UUID })
  declare xpActionId: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  declare xpAwarded: number;

  @BelongsTo(() => XpAction)
  declare xpAction: XpAction;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
