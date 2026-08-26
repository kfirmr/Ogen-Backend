import { DATA_LENGTHS } from '@Constants/data-length';
import { IsEmail, IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(DATA_LENGTHS.EMAIL)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(DATA_LENGTHS.NAME)
  fullName?: string;
}
