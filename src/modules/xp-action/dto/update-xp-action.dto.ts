import {
  Min,
  IsInt,
  IsString,
  MaxLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';

import { DATA_LENGTHS } from '@Constants/data-length';

export class UpdateXpActionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  xpValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.DESCRIPTION)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
