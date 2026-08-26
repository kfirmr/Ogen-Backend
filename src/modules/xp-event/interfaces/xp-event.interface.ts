import { Optional } from 'sequelize';
import { IXpAction } from '@Modules/xp-action/interfaces/xp-action.interface';

export interface IXpEvent {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  xpAwarded: number;
  xpActionId: string;
  xpAction?: IXpAction;
}

export type TCreateXpEvent = Optional<
  IXpEvent,
  'id' | 'createdAt' | 'updatedAt'
>;
