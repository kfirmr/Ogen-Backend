import {
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import { DATA_LENGTHS } from '@Constants/data-length';
import { TBankSyncFailure } from '../constants/bank-sync.constant';

export class ReportBankSyncFailureDto {
  @IsNotEmpty()
  @IsEnum(TBankSyncFailure)
  reason!: TBankSyncFailure;

  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.DESCRIPTION)
  message?: string;
}
