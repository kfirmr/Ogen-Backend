import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  TImportStatus,
  TERMINAL_IMPORT_STATUSES,
} from './constants/import-status.constant';

import { Sequelize } from 'sequelize';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { ProviderNames } from '@Providers/database/provider-names';
import { StatementImport } from './entities/statement-import.entity';
import { UpdateImportStatusDto } from './dto/update-import-status.dto';
import { GetStatementImportsDto } from './dto/get-statement-imports.dto';
import { StatementImportRepository } from './statement-import.repository';
import { CreateStatementImportDto } from './dto/create-statement-import.dto';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { IMPORT_STATUS_PATCH_BY_STATUS } from './constants/status-patch.constant';

@Injectable()
export class StatementImportService {
  private readonly logger = new TypedLogger('StatementImportService');

  constructor(
    @Inject(ProviderNames.SEQUELIZE)
    private readonly sequelize: Sequelize,
    private readonly transactionService: TransactionService,
    private readonly statementImportRepository: StatementImportRepository,
  ) {}

  public getByUser(
    userId: string,
    data: GetStatementImportsDto,
  ): Promise<IBatchResult<StatementImport>> {
    return this.statementImportRepository.getByUser(userId, data);
  }

  public async getById(id: string, userId: string): Promise<StatementImport> {
    const statementImport = await this.statementImportRepository.findById(
      id,
      userId,
    );

    if (statementImport == null) {
      throw new NotFoundException('Statement import not found');
    }

    return statementImport;
  }

  public create(
    userId: string,
    data: CreateStatementImportDto,
  ): Promise<StatementImport> {
    return this.statementImportRepository.create({
      userId,
      source: data.source,
      filename: data.filename ?? null,
    });
  }

  public async updateStatus(
    id: string,
    userId: string,
    data: UpdateImportStatusDto,
  ): Promise<StatementImport> {
    const statementImport = await this.getById(id, userId);

    if (TERMINAL_IMPORT_STATUSES.includes(statementImport.status)) {
      throw new BadRequestException('Import already reached a final status');
    }

    const statusPatch = IMPORT_STATUS_PATCH_BY_STATUS[data.status](data);

    await this.statementImportRepository.update(id, {
      ...statusPatch,
      status: data.status,
    });

    return this.getById(id, userId);
  }

  public async undo(id: string, userId: string): Promise<StatementImport> {
    const statementImport = await this.getById(id, userId);

    if (statementImport.status === TImportStatus.PROCESSING) {
      throw new BadRequestException('Import is still processing');
    }

    const transaction = await this.sequelize.transaction();

    try {
      await this.transactionService.deleteByImport(
        userId,
        statementImport.id,
        transaction,
      );

      await this.statementImportRepository.update(
        id,
        { transactionCount: 0 },
        transaction,
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      this.logger.error({ message: 'Failed to undo statement import', error });

      throw error;
    }

    return this.getById(id, userId);
  }
}
