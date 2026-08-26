import {
  Min,
  IsInt,
  IsString,
  MaxLength,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import { DATA_LENGTHS } from '@Constants/data-length';

export class CreateXpActionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.NAME)
  key!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  xpValue!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.DESCRIPTION)
  description!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
