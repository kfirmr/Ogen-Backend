import { IsEnum, IsOptional } from 'class-validator';
import { BatchQueryDto } from '@Dto/batch-query.dto';
import { TSubscriptionStatus } from '../constants/subscription-status.constant';

export class GetSubscriptionsDto extends BatchQueryDto {
  @IsOptional()
  @IsEnum(TSubscriptionStatus)
  status?: TSubscriptionStatus;
}
