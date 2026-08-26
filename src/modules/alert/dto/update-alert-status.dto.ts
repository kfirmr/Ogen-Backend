import { IsEnum, IsNotEmpty } from 'class-validator';
import { TAlertStatus } from '../constants/alert-status.constant';

export class UpdateAlertStatusDto {
  @IsNotEmpty()
  @IsEnum(TAlertStatus)
  status!: TAlertStatus;
}
