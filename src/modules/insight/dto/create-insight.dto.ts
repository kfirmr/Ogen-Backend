import {
  IsUUID,
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import { DATA_LENGTHS } from '@Constants/data-length';
import { TInsightType } from '../constants/insight-type.constant';

export class CreateInsightDto {
  @IsNotEmpty()
  @IsEnum(TInsightType)
  type!: TInsightType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.DESCRIPTION)
  body!: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsUUID()
  transactionId?: string;
}
