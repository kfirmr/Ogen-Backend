import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

import { DATA_LENGTHS } from '@Constants/data-length';

export class SignUpDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(DATA_LENGTHS.EMAIL)
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.NAME)
  fullName!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(DATA_LENGTHS.PASSWORD_MIN)
  password!: string;
}
