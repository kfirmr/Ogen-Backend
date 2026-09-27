import {
  Get,
  Post,
  Body,
  Param,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { IBatchResult } from '@Interfaces/batch.interface';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { StatementImportService } from './statement-import.service';
import { StatementImport } from './entities/statement-import.entity';
import { GetStatementImportsDto } from './dto/get-statement-imports.dto';

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

  @Get(':id')
  public getById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StatementImport> {
    return this.statementImportService.getById(id, userId);
  }

  @Post(':id/undo')
  public undo(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StatementImport> {
    return this.statementImportService.undo(id, userId);
  }
}
