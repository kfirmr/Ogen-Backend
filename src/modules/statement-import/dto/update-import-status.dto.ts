import {
  Min,
  IsInt,
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import { Type } from 'class-transformer';
import { DATA_LENGTHS } from '@Constants/data-length';
import { TImportStatus } from '../constants/import-status.constant';

export class UpdateImportStatusDto {
  @IsNotEmpty()
  @IsEnum(TImportStatus)
  status!: TImportStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  transactionCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.DESCRIPTION)
  errorMessage?: string;
}
