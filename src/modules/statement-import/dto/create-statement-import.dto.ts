import { DATA_LENGTHS } from '@Constants/data-length';
import { TImportSource } from '../constants/import-source.constant';
import { IsEnum, IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateStatementImportDto {
  @IsOptional()
  @IsEnum(TImportSource)
  source?: TImportSource;

  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.FILENAME)
  filename?: string;
}
