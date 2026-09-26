import { IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { TBankCompany } from '../constants/bank-company.constant';

export class CreateBankConnectionDto {
  @IsNotEmpty()
  @IsEnum(TBankCompany)
  company!: TBankCompany;

  // The required keys differ per company, so they are checked against
  // REQUIRED_CREDENTIAL_FIELDS_BY_COMPANY in the service rather than by a fixed class.
  @IsNotEmpty()
  @IsObject()
  credentials!: Record<string, string>;
}
