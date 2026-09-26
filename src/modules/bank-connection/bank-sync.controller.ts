import {
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import {
  IPendingBankOtp,
  IClaimedBankConnection,
} from './interfaces/bank-connection.interface';

import { ApiTags } from '@nestjs/swagger';
import { BankConnectionService } from './bank-connection.service';
import { WorkerEndpoint } from '@Decorators/worker-endpoint.decorator';
import { ClaimBankConnectionsDto } from './dto/claim-bank-connections.dto';
import { ReportBankSyncSuccessDto } from './dto/report-bank-sync-success.dto';
import { ReportBankSyncFailureDto } from './dto/report-bank-sync-failure.dto';
import { StatementImport } from '@Modules/statement-import/entities/statement-import.entity';

// Called only by the bank-scraper worker, authenticated by the between-services token.
@ApiTags('bank-sync')
@Controller('bank-sync')
@WorkerEndpoint()
export class BankSyncController {
  constructor(private readonly bankConnectionService: BankConnectionService) {}

  @Post('claim')
  public claim(
    @Body() data: ClaimBankConnectionsDto,
  ): Promise<IClaimedBankConnection[]> {
    return this.bankConnectionService.claim(data.scope);
  }

  @Post(':id/otp-request')
  @HttpCode(HttpStatus.NO_CONTENT)
  public requestOtp(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.bankConnectionService.requestOtp(id);
  }

  @Post(':id/otp-take')
  public takeOtp(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IPendingBankOtp> {
    return this.bankConnectionService.takeOtp(id);
  }

  @Post(':id/success')
  public reportSuccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ReportBankSyncSuccessDto,
  ): Promise<StatementImport> {
    return this.bankConnectionService.reportSuccess(id, data);
  }

  @Post(':id/failure')
  @HttpCode(HttpStatus.NO_CONTENT)
  public reportFailure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ReportBankSyncFailureDto,
  ): Promise<void> {
    return this.bankConnectionService.reportFailure(id, data);
  }
}
