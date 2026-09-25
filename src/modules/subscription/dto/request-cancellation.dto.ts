import { DATA_LENGTHS } from '@Constants/data-length';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export class RequestCancellationDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(DATA_LENGTHS.EMAIL)
  cancellationEmail?: string;
}
