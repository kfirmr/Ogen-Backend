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
import { LevelService } from './level.service';
import { Level } from './entities/level.entity';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { IUserProgress } from './interfaces/user-progress.interface';

@ApiTags('level')
@Controller('level')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Get()
  public getAll(): Promise<Level[]> {
    return this.levelService.getAll();
  }

  @Get('me')
  public getUserProgress(
    @CurrentUser() userId: string,
  ): Promise<IUserProgress> {
    return this.levelService.getUserProgress(userId);
  }

  @Get(':id')
  public getById(@Param('id', ParseUUIDPipe) id: string): Promise<Level> {
    return this.levelService.getById(id);
  }

  @Post()
  public create(@Body() data: CreateLevelDto): Promise<Level> {
    return this.levelService.create(data);
  }

  @Put(':id')
  public update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateLevelDto,
  ): Promise<Level> {
    return this.levelService.update(id, data);
  }
}
