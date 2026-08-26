import { DATA_LENGTHS } from '@Constants/data-length';
import { IsEmail, IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(DATA_LENGTHS.EMAIL)
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}
