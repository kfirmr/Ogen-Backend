import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { UniqueConstraintError } from 'sequelize';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { DraftAction } from './entities/draft-action.entity';
import { GetDraftActionsDto } from './dto/get-draft-actions.dto';
import { DraftActionRepository } from './draft-action.repository';
import { TCreateDraftAction } from './interfaces/draft-action.interface';
import { UpdateDraftActionStatusDto } from './dto/update-draft-action-status.dto';
import { DRAFT_ACTION_STATUS_TRANSITIONS } from './constants/draft-action-status.constant';

@Injectable()
export class DraftActionService {
  private readonly logger = new TypedLogger('DraftActionService');

  constructor(private readonly draftActionRepository: DraftActionRepository) {}

  public getByUser(
    userId: string,
    data: GetDraftActionsDto,
  ): Promise<IBatchResult<DraftAction>> {
    return this.draftActionRepository.getByUser(userId, data);
  }

  public async getById(id: string, userId: string): Promise<DraftAction> {
    const draftAction = await this.draftActionRepository.findById(id, userId);

    if (draftAction == null) {
      throw new NotFoundException('Draft action not found');
    }

    return draftAction;
  }

  // Idempotent by insightId: the leak-response pipeline only ever passes an insight through
  // once (InsightScanService returns just newly-created insights), but a duplicate call here
  // should quietly reuse the existing draft rather than fail the whole import.
  public async create(data: TCreateDraftAction): Promise<DraftAction | null> {
    try {
      return await this.draftActionRepository.create(data);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return this.draftActionRepository.findByInsight(data.insightId);
      }

      this.logger.error({ message: 'Failed to create draft action', error });

      throw error;
    }
  }

  public async updateStatus(
    id: string,
    userId: string,
    data: UpdateDraftActionStatusDto,
  ): Promise<DraftAction> {
    const draftAction = await this.getById(id, userId);
    const allowedNextStatuses =
      DRAFT_ACTION_STATUS_TRANSITIONS[draftAction.status];

    if (!allowedNextStatuses.includes(data.status)) {
      throw new BadRequestException(
        `Cannot move a draft action from ${draftAction.status} to ${data.status}`,
      );
    }

    await this.draftActionRepository.update(id, { status: data.status });

    return this.getById(id, userId);
  }
}
