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
import { CurrentUser } from '@Decorators/current-user.decorator';
import { StatementImportService } from './statement-import.service';
import { StatementImport } from './entities/statement-import.entity';
import { UpdateImportStatusDto } from './dto/update-import-status.dto';
import { GetStatementImportsDto } from './dto/get-statement-imports.dto';
import { CreateStatementImportDto } from './dto/create-statement-import.dto';

@ApiTags('statement-import')
@Controller('statement-import')
export class StatementImportController {
  constructor(
    private readonly statementImportService: StatementImportService,
  ) {}

  @Post('search')
  public getByUser(
    @CurrentUser() userId: string,
    @Body() data: GetStatementImportsDto,
  ): Promise<IBatchResult<StatementImport>> {
    return this.statementImportService.getByUser(userId, data);
  }

  @Post()
  public create(
    @CurrentUser() userId: string,
    @Body() data: CreateStatementImportDto,
  ): Promise<StatementImport> {
    return this.statementImportService.create(userId, data);
  }

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StatementImport> {
    return this.statementImportService.getById(id, userId);
  }

  @Patch(':id/status')
  public updateStatus(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateImportStatusDto,
  ): Promise<StatementImport> {
    return this.statementImportService.updateStatus(id, userId, data);
  }

  @Post(':id/undo')
  public undo(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StatementImport> {
    return this.statementImportService.undo(id, userId);
  }
}
