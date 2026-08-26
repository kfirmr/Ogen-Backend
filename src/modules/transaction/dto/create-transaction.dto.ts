import {
  IsUUID,
  Matches,
  IsString,
  MaxLength,
  IsOptional,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

import { MONEY_REGEX } from '@Constants/money';
import { DATA_LENGTHS } from '@Constants/data-length';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.DESCRIPTION)
  originalDescription!: string;

  @IsNotEmpty()
  @Matches(MONEY_REGEX.AMOUNT)
  amount!: string;

  @IsNotEmpty()
  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @Matches(MONEY_REGEX.CURRENCY)
  currency?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.EXTERNAL_ID)
  externalId?: string;
}
