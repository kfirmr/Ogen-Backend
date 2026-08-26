import { DATA_LENGTHS } from '@Constants/data-length';
import { Min, IsInt, IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateLevelDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  xpRequired?: number;

  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.NAME)
  title?: string;
}
