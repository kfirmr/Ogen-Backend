import {
  Get,
  Put,
  Post,
  Body,
  Param,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { XpActionService } from './xp-action.service';
import { XpAction } from './entities/xp-action.entity';
import { CreateXpActionDto } from './dto/create-xp-action.dto';
import { UpdateXpActionDto } from './dto/update-xp-action.dto';

@ApiTags('xp-action')
@Controller('xp-action')
export class XpActionController {
  constructor(private readonly xpActionService: XpActionService) {}

  @Get()
  public getAll(): Promise<XpAction[]> {
    return this.xpActionService.getAll();
  }

  @Get(':id')
  public getById(@Param('id', ParseUUIDPipe) id: string): Promise<XpAction> {
    return this.xpActionService.getById(id);
  }

  @Post()
  public create(@Body() data: CreateXpActionDto): Promise<XpAction> {
    return this.xpActionService.create(data);
  }

  @Put(':id')
  public update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateXpActionDto,
  ): Promise<XpAction> {
    return this.xpActionService.update(id, data);
  }
}
