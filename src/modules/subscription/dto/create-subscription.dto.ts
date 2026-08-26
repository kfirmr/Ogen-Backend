import {
  IsUUID,
  IsEnum,
  Matches,
  IsOptional,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

import { MONEY_REGEX } from '@Constants/money';
import { TBillingCycle } from '../constants/billing-cycle.constant';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @Matches(MONEY_REGEX.AMOUNT)
  amount!: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @Matches(MONEY_REGEX.CURRENCY)
  currency?: string;

  @IsOptional()
  @IsEnum(TBillingCycle)
  billingCycle?: TBillingCycle;

  @IsOptional()
  @IsDateString()
  nextChargeDate?: string;
}
