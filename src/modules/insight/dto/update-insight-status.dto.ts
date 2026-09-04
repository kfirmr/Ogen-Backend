import { IsEnum, IsNotEmpty } from 'class-validator';
import { TInsightStatus } from '../constants/insight-status.constant';

export class UpdateInsightStatusDto {
  @IsNotEmpty()
  @IsEnum(TInsightStatus)
  status!: TInsightStatus;
}
