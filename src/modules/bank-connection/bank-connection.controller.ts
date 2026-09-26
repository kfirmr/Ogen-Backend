import {
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { SubmitBankOtpDto } from './dto/submit-bank-otp.dto';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { BankConnectionService } from './bank-connection.service';
import { CreateBankConnectionDto } from './dto/create-bank-connection.dto';
import { TBankConnectionSummary } from './interfaces/bank-connection.interface';

@ApiTags('bank-connection')
@Controller('bank-connection')
export class BankConnectionController {
  constructor(private readonly bankConnectionService: BankConnectionService) {}

  @Get()
  public getByUser(
    @CurrentUser() userId: string,
  ): Promise<TBankConnectionSummary[]> {
    return this.bankConnectionService.getByUser(userId);
  }

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TBankConnectionSummary> {
    return this.bankConnectionService.getById(id, userId);
  }

  @Post()
  public connect(
    @CurrentUser() userId: string,
    @Body() data: CreateBankConnectionDto,
  ): Promise<TBankConnectionSummary> {
    return this.bankConnectionService.connect(userId, data);
  }

  @Post(':id/otp')
  public submitOtp(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: SubmitBankOtpDto,
  ): Promise<TBankConnectionSummary> {
    return this.bankConnectionService.submitOtp(userId, id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public disconnect(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.bankConnectionService.disconnect(userId, id);
  }
}
