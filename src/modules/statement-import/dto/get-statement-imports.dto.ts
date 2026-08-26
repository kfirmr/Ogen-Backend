import { IsEnum, IsOptional } from 'class-validator';
import { BatchQueryDto } from '@Dto/batch-query.dto';
import { TImportStatus } from '../constants/import-status.constant';

export class GetStatementImportsDto extends BatchQueryDto {
  @IsOptional()
  @IsEnum(TImportStatus)
  status?: TImportStatus;
}
