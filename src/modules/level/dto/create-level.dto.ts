import { DATA_LENGTHS } from '@Constants/data-length';
import { IsInt, IsString, MaxLength, IsNotEmpty, Min } from 'class-validator';

export class CreateLevelDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  levelNumber!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  xpRequired!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.NAME)
  title!: string;
}
