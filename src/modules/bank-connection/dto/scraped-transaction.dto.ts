import {
  IsIn,
  Matches,
  IsNumber,
  IsString,
  MaxLength,
  IsOptional,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

import {
  TScrapedTransactionStatus,
  SCRAPED_TRANSACTION_STATUS_VALUES,
} from '../constants/scraped-transaction.constant';

import { MONEY_REGEX } from '@Constants/money';
import { DATA_LENGTHS } from '@Constants/data-length';

// The subset of israeli-bank-scrapers' Transaction the worker sends, under the library's own names;
// the global pipe forbids unknown fields, so the worker picks exactly these.
export class ScrapedTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.EXTERNAL_ID)
  identifier?: string;

  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @IsNumber()
  chargedAmount!: number;

  @IsOptional()
  @Matches(MONEY_REGEX.CURRENCY)
  chargedCurrency?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.DESCRIPTION)
  description!: string;

  @IsNotEmpty()
  @IsIn(SCRAPED_TRANSACTION_STATUS_VALUES)
  status!: TScrapedTransactionStatus;
}
