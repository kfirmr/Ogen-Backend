import { Sequelize, Transaction } from 'sequelize';
import { Inject, Injectable } from '@nestjs/common';
import { XpEvent } from './entities/xp-event.entity';
import { UserService } from '@Modules/user/user.service';
import { GetXpEventsDto } from './dto/get-xp-events.dto';
import { TypedLogger } from '../../logger/logger.service';
import { XpEventRepository } from './xp-event.repository';
import { IBatchResult } from '@Interfaces/batch.interface';
import { LevelService } from '@Modules/level/level.service';
import { ProviderNames } from '@Providers/database/provider-names';
import { XpActionService } from '@Modules/xp-action/xp-action.service';
import { IXpAwardResult } from './interfaces/xp-award-result.interface';

@Injectable()
export class XpEventService {
  private readonly logger = new TypedLogger('XpEventService');

  constructor(
    @Inject(ProviderNames.SEQUELIZE)
    private readonly sequelize: Sequelize,
    private readonly userService: UserService,
    private readonly levelService: LevelService,
    private readonly xpActionService: XpActionService,
    private readonly xpEventRepository: XpEventRepository,
  ) {}

  public getByUser(
    userId: string,
    data: GetXpEventsDto,
  ): Promise<IBatchResult<XpEvent>> {
    return this.xpEventRepository.getByUser(userId, data);
  }

  public async award(
    userId: string,
    actionKey: string,
    transaction?: Transaction,
  ): Promise<IXpAwardResult | null> {
    if (transaction != null) {
      return this.awardWithinTransaction(userId, actionKey, transaction);
    }

    const ownTransaction = await this.sequelize.transaction();

    try {
      const result = await this.awardWithinTransaction(
        userId,
        actionKey,
        ownTransaction,
      );

      await ownTransaction.commit();

      return result;
    } catch (error) {
      await ownTransaction.rollback();
      this.logger.error({
        message: 'Failed to award xp',
        error,
        userId,
        actionKey,
      });

      throw error;
    }
  }

  private async awardWithinTransaction(
    userId: string,
    actionKey: string,
    transaction: Transaction,
  ): Promise<IXpAwardResult | null> {
    const action = await this.xpActionService.getActiveByKey(actionKey);

    if (action == null) {
      this.logger.warn({
        message: 'Skipped xp award: unknown or inactive action',
        actionKey,
        userId,
      });

      return null;
    }

    const xpEvent = await this.xpEventRepository.create(
      { userId, xpActionId: action.id, xpAwarded: action.xpValue },
      transaction,
    );

    const user = await this.userService.incrementXp(
      userId,
      action.xpValue,
      transaction,
    );

    const previousLevel = await this.levelService.getLevelForXp(
      user.totalXp - action.xpValue,
    );
    const newLevel = await this.levelService.getLevelForXp(user.totalXp);
    const leveledUp = newLevel.levelNumber !== previousLevel.levelNumber;

    return {
      xpEvent,
      leveledUp,
      totalXp: user.totalXp,
      levelTitle: newLevel.title,
      currentLevel: newLevel.levelNumber,
    };
  }
}
