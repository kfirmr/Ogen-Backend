import { IsEnum, IsOptional } from 'class-validator';
import { BatchQueryDto } from '@Dto/batch-query.dto';
import { TDraftActionStatus } from '../constants/draft-action-status.constant';

export class GetDraftActionsDto extends BatchQueryDto {
  @IsOptional()
  @IsEnum(TDraftActionStatus)
  status?: TDraftActionStatus;
}
