import {
  Max,
  Min,
  IsInt,
  IsUUID,
  IsOptional,
  IsDateString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { BATCH_SIZES } from '@Constants/batch';

export class BatchCursorDto {
  @IsUUID()
  id!: string;

  @IsDateString()
  createdAt!: string;
}

export class BatchQueryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BatchCursorDto)
  batchCursor?: BatchCursorDto;

  @IsOptional()
  @IsInt()
  @Min(BATCH_SIZES.MIN)
  @Max(BATCH_SIZES.MAX)
  @Type(() => Number)
  batchSize?: number;
}
