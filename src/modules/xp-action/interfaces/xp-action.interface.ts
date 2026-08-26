import { Optional } from 'sequelize';

export interface IXpAction {
  id: string;
  key: string;
  xpValue: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  description: string;
}

export type TCreateXpAction = Optional<
  IXpAction,
  'id' | 'isActive' | 'createdAt' | 'updatedAt'
>;
