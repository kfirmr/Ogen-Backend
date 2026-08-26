import { Optional } from 'sequelize';

export interface ILevel {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  xpRequired: number;
  levelNumber: number;
}

export type TCreateLevel = Optional<ILevel, 'id' | 'createdAt' | 'updatedAt'>;
