import { Type } from 'class-transformer';
import { ScrapedAccountDto } from './scraped-account.dto';
import { IsArray, ValidateNested } from 'class-validator';

export class ReportBankSyncSuccessDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScrapedAccountDto)
  accounts!: ScrapedAccountDto[];
}
