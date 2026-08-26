import { IsUUID, IsOptional } from 'class-validator';

export class AttachSubscriptionDto {
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
}
