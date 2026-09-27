import { IsNotEmpty, IsDateString } from 'class-validator';

export class GetTransactionSummaryDto {
  @IsNotEmpty()
  @IsDateString()
  fromDate!: string;

  @IsNotEmpty()
  @IsDateString()
  toDate!: string;
}
