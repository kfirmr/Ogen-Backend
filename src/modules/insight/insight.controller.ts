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
import { InsightService } from './insight.service';
import { Insight } from './entities/insight.entity';
import { GetInsightsDto } from './dto/get-insights.dto';
import { IBatchResult } from '@Interfaces/batch.interface';
import { CreateInsightDto } from './dto/create-insight.dto';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { UpdateInsightStatusDto } from './dto/update-insight-status.dto';

@ApiTags('insight')
@Controller('insight')
export class InsightController {
  constructor(private readonly insightService: InsightService) {}

  @Post('search')
  public getByUser(
    @CurrentUser() userId: string,
    @Body() data: GetInsightsDto,
  ): Promise<IBatchResult<Insight>> {
    return this.insightService.getByUser(userId, data);
  }

  @Post()
  public create(
    @CurrentUser() userId: string,
    @Body() data: CreateInsightDto,
  ): Promise<Insight> {
    return this.insightService.create(userId, data);
  }

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Insight> {
    return this.insightService.getById(id, userId);
  }

  @Patch(':id/status')
  public updateStatus(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateInsightStatusDto,
  ): Promise<Insight> {
    return this.insightService.updateStatus(id, userId, data);
  }
}
