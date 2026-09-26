import {
  IsArray,
  IsString,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { DATA_LENGTHS } from '@Constants/data-length';
import { ScrapedTransactionDto } from './scraped-transaction.dto';

export class ScrapedAccountDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.EXTERNAL_ID)
  accountNumber!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScrapedTransactionDto)
  txns!: ScrapedTransactionDto[];
}
