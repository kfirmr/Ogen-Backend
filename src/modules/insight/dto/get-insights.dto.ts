import { IsEnum, IsOptional } from 'class-validator';
import { BatchQueryDto } from '@Dto/batch-query.dto';
import { TInsightType } from '../constants/insight-type.constant';
import { TInsightStatus } from '../constants/insight-status.constant';

export class GetInsightsDto extends BatchQueryDto {
  @IsOptional()
  @IsEnum(TInsightType)
  type?: TInsightType;

  @IsOptional()
  @IsEnum(TInsightStatus)
  status?: TInsightStatus;
}
