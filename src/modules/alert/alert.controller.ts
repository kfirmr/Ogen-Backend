import {
  Get,
  Post,
  Body,
  Param,
  Patch,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { AlertService } from './alert.service';
import { Alert } from './entities/alert.entity';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { CreateAlertDto } from './dto/create-alert.dto';
import { IBatchResult } from '@Interfaces/batch.interface';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@ApiTags('alert')
@Controller('alert')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Post('search')
  public getByUser(
    @CurrentUser() userId: string,
    @Body() data: GetAlertsDto,
  ): Promise<IBatchResult<Alert>> {
    return this.alertService.getByUser(userId, data);
  }

  @Post()
  public create(
    @CurrentUser() userId: string,
    @Body() data: CreateAlertDto,
  ): Promise<Alert> {
    return this.alertService.create(userId, data);
  }

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Alert> {
    return this.alertService.getById(id, userId);
  }

  @Patch(':id/status')
  public updateStatus(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateAlertStatusDto,
  ): Promise<Alert> {
    return this.alertService.updateStatus(id, userId, data);
  }
}
