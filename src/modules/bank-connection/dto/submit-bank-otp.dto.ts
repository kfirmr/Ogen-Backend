import { Matches, IsString, IsNotEmpty } from 'class-validator';
import { OTP_CODE_PATTERN } from '../constants/bank-sync.constant';

export class SubmitBankOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(OTP_CODE_PATTERN)
  code!: string;
}
