import {
  IsEnum,
  IsEmail,
  Matches,
  IsString,
  MaxLength,
  IsOptional,
} from 'class-validator';

import { MONEY_REGEX } from '@Constants/money';
import { DATA_LENGTHS } from '@Constants/data-length';
import { TVendorCategory } from '../constants/vendor-category.constant';

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.NAME)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(DATA_LENGTHS.EMAIL)
  cancellationEmail?: string;

  @IsOptional()
  @Matches(MONEY_REGEX.AMOUNT)
  averageMarketPrice?: string;

  @IsOptional()
  @Matches(MONEY_REGEX.CURRENCY)
  currency?: string;

  @IsOptional()
  @IsEnum(TVendorCategory)
  category?: TVendorCategory;
}
