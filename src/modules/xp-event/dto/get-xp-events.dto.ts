import { IsUUID, IsOptional } from 'class-validator';
import { BatchQueryDto } from '@Dto/batch-query.dto';

export class GetXpEventsDto extends BatchQueryDto {
  @IsOptional()
  @IsUUID()
  xpActionId?: string;
}
