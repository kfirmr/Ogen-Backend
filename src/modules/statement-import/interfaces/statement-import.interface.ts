import { Optional } from 'sequelize';
import { TImportSource } from '../constants/import-source.constant';
import { TImportStatus } from '../constants/import-status.constant';

export interface IStatementImport {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  status: TImportStatus;
  source: TImportSource;
  filename: string | null;
  transactionCount: number;
  completedAt: Date | null;
  errorMessage: string | null;
}

export type TCreateStatementImport = Optional<
  IStatementImport,
  | 'id'
  | 'source'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'completedAt'
  | 'errorMessage'
  | 'transactionCount'
>;
