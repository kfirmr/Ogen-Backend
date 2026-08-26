import { ApiTags } from '@nestjs/swagger';
import { XpEventService } from './xp-event.service';
import { XpEvent } from './entities/xp-event.entity';
import { Post, Body, Controller } from '@nestjs/common';
import { GetXpEventsDto } from './dto/get-xp-events.dto';
import { IBatchResult } from '@Interfaces/batch.interface';
import { CurrentUser } from '@Decorators/current-user.decorator';

@ApiTags('xp-event')
@Controller('xp-event')
export class XpEventController {
  constructor(private readonly xpEventService: XpEventService) {}

  @Post('search')
  public getByUser(
    @CurrentUser() userId: string,
    @Body() data: GetXpEventsDto,
  ): Promise<IBatchResult<XpEvent>> {
    return this.xpEventService.getByUser(userId, data);
  }
}
