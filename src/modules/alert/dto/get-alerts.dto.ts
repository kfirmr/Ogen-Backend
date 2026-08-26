import { IsEnum, IsOptional } from 'class-validator';
import { BatchQueryDto } from '@Dto/batch-query.dto';
import { TAlertType } from '../constants/alert-type.constant';
import { TAlertStatus } from '../constants/alert-status.constant';

export class GetAlertsDto extends BatchQueryDto {
  @IsOptional()
  @IsEnum(TAlertType)
  type?: TAlertType;

  @IsOptional()
  @IsEnum(TAlertStatus)
  status?: TAlertStatus;
}
