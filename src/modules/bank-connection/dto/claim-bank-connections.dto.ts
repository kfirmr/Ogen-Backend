import { IsEnum, IsNotEmpty } from 'class-validator';
import { TBankSyncScope } from '../constants/bank-sync.constant';

export class ClaimBankConnectionsDto {
  @IsNotEmpty()
  @IsEnum(TBankSyncScope)
  scope!: TBankSyncScope;
}
