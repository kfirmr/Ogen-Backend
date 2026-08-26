import { TImportStatus } from './import-status.constant';
import { UpdateImportStatusDto } from '../dto/update-import-status.dto';
import { IStatementImport } from '../interfaces/statement-import.interface';

type TStatusPatchBuilder = (
  data: UpdateImportStatusDto,
) => Partial<IStatementImport>;

export const IMPORT_STATUS_PATCH_BY_STATUS: Record<
  TImportStatus,
  TStatusPatchBuilder
> = {
  [TImportStatus.PENDING]: () => ({}),
  [TImportStatus.PROCESSING]: () => ({}),
  [TImportStatus.FAILED]: (data) => ({
    completedAt: new Date(),
    errorMessage: data.errorMessage ?? null,
  }),
  [TImportStatus.COMPLETED]: (data) => ({
    completedAt: new Date(),
    transactionCount: data.transactionCount ?? 0,
  }),
};
