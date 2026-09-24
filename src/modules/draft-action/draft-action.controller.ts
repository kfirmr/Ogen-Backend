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
import { IBatchResult } from '@Interfaces/batch.interface';
import { DraftActionService } from './draft-action.service';
import { DraftAction } from './entities/draft-action.entity';
import { GetDraftActionsDto } from './dto/get-draft-actions.dto';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { UpdateDraftActionStatusDto } from './dto/update-draft-action-status.dto';

@ApiTags('draft-action')
@Controller('draft-action')
export class DraftActionController {
  constructor(private readonly draftActionService: DraftActionService) {}

  @Post('search')
  public getByUser(
    @CurrentUser() userId: string,
    @Body() data: GetDraftActionsDto,
  ): Promise<IBatchResult<DraftAction>> {
    return this.draftActionService.getByUser(userId, data);
  }

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DraftAction> {
    return this.draftActionService.getById(id, userId);
  }

  @Patch(':id/status')
  public updateStatus(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateDraftActionStatusDto,
  ): Promise<DraftAction> {
    return this.draftActionService.updateStatus(id, userId, data);
  }
}
