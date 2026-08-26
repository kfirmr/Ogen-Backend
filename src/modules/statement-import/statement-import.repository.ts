import {
  buildNextCursor,
  resolveBatchSize,
  buildCursorCondition,
} from '@Utilities/pagination.utility';

import {
  IStatementImport,
  TCreateStatementImport,
} from './interfaces/statement-import.interface';

import { Injectable } from '@nestjs/common';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { IBatchResult } from '@Interfaces/batch.interface';
import { StatementImport } from './entities/statement-import.entity';
import { GetStatementImportsDto } from './dto/get-statement-imports.dto';

@Injectable()
export class StatementImportRepository {
  public findById(id: string, userId: string): Promise<StatementImport | null> {
    return StatementImport.findOne({ where: { id, userId } });
  }

  public async getByUser(
    userId: string,
    data: GetStatementImportsDto,
  ): Promise<IBatchResult<StatementImport>> {
    const batchSize = resolveBatchSize(data.batchSize);
    const conditions = this.buildConditions(userId, data);

    const items = await StatementImport.findAll({
      limit: batchSize,
      where: conditions,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return { items, nextCursor: buildNextCursor(items, batchSize) };
  }

  public create(
    data: TCreateStatementImport,
    transaction?: Transaction,
  ): Promise<StatementImport> {
    return StatementImport.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<IStatementImport>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return StatementImport.update(data, { where: { id }, transaction });
  }

  private buildConditions(
    userId: string,
    data: GetStatementImportsDto,
  ): WhereOptions<StatementImport> {
    const filterConditions: WhereOptions<StatementImport>[] = [];

    if (data.status != null) {
      filterConditions.push({ status: data.status });
    }

    return {
      [Op.and]: [
        { userId },
        buildCursorCondition(data.batchCursor),
        ...filterConditions,
      ],
    };
  }
}
