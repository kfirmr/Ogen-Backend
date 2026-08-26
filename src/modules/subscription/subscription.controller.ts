import {
  Get,
  Put,
  Post,
  Body,
  Param,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { IBatchResult } from '@Interfaces/batch.interface';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './entities/subscription.entity';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { GetSubscriptionsDto } from './dto/get-subscriptions.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@ApiTags('subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('search')
  public getByUser(
    @CurrentUser() userId: string,
    @Body() data: GetSubscriptionsDto,
  ): Promise<IBatchResult<Subscription>> {
    return this.subscriptionService.getByUser(userId, data);
  }

  @Post()
  public create(
    @CurrentUser() userId: string,
    @Body() data: CreateSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptionService.create(userId, data);
  }

  @Post(':id/request-cancellation')
  public requestCancellation(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Subscription> {
    return this.subscriptionService.requestCancellation(id, userId);
  }

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Subscription> {
    return this.subscriptionService.getById(id, userId);
  }

  @Post(':id/confirm-cancellation')
  public confirmCancellation(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Subscription> {
    return this.subscriptionService.confirmCancellation(id, userId);
  }

  @Put(':id')
  public update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptionService.update(id, userId, data);
  }

  @Delete(':id')
  public delete(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.subscriptionService.delete(id, userId);
  }
}
