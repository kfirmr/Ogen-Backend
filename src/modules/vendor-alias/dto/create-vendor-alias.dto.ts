import { DATA_LENGTHS } from '@Constants/data-length';
import { IsUUID, IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateVendorAliasDto {
  @IsNotEmpty()
  @IsUUID()
  vendorId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(DATA_LENGTHS.PATTERN)
  pattern!: string;
}
