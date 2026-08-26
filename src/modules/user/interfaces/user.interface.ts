import { Optional } from 'sequelize';

export interface IUser {
  id: string;
  email: string;
  totalXp: number;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  passwordHash: string;
  deletedAt: Date | null;
}

export type TCreateUser = Optional<
  IUser,
  'id' | 'totalXp' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;
