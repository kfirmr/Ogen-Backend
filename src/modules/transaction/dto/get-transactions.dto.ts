import { BatchQueryDto } from '@Dto/batch-query.dto';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class GetTransactionsDto extends BatchQueryDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
