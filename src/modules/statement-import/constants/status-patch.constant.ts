import {
  IStatementImport,
  IImportStatusUpdate,
} from '../interfaces/statement-import.interface';

import { TImportStatus } from './import-status.constant';

type TStatusPatchBuilder = (
  data: IImportStatusUpdate,
) => Partial<IStatementImport>;

export const IMPORT_STATUS_PATCH_BY_STATUS: Record<
  TImportStatus,
  TStatusPatchBuilder
> = {
  [TImportStatus.PROCESSING]: () => ({}),
  [TImportStatus.FAILED]: (data) => ({
    completedAt: new Date(),
    errorMessage: data.errorMessage ?? null,
  }),
  [TImportStatus.COMPLETED]: (data) => ({
    completedAt: new Date(),
    errorMessage: data.errorMessage ?? null,
    transactionCount: data.transactionCount ?? 0,
  }),
};
