import { IsEnum, IsNotEmpty } from 'class-validator';
import { TDraftActionStatus } from '../constants/draft-action-status.constant';

export class UpdateDraftActionStatusDto {
  @IsNotEmpty()
  @IsEnum(TDraftActionStatus)
  status!: TDraftActionStatus;
}
