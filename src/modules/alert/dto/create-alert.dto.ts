import {
  IsUUID,
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import { DATA_LENGTHS } from '@Constants/data-length';
import { TAlertType } from '../constants/alert-type.constant';

export class CreateAlertDto {
  @IsNotEmpty()
  @IsEnum(TAlertType)
  type!: TAlertType;

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
