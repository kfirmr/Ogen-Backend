import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Sequelize } from 'sequelize';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Subscription } from './entities/subscription.entity';
import { VendorService } from '@Modules/vendor/vendor.service';
import { GetSubscriptionsDto } from './dto/get-subscriptions.dto';
import { SubscriptionRepository } from './subscription.repository';
import { ProviderNames } from '@Providers/database/provider-names';
import { XP_ACTION_KEYS } from '@Constants/xp-action-keys.constant';
import { XpEventService } from '@Modules/xp-event/xp-event.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { TSubscriptionStatus } from './constants/subscription-status.constant';

@Injectable()
export class SubscriptionService {
  private readonly logger = new TypedLogger('SubscriptionService');

  constructor(
    @Inject(ProviderNames.SEQUELIZE)
    private readonly sequelize: Sequelize,
    private readonly vendorService: VendorService,
    private readonly xpEventService: XpEventService,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  public getByUser(
    userId: string,
    data: GetSubscriptionsDto,
  ): Promise<IBatchResult<Subscription>> {
    return this.subscriptionRepository.getByUser(userId, data);
  }

  public async getById(id: string, userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(id, userId);

    if (subscription == null) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  public async create(
    userId: string,
    data: CreateSubscriptionDto,
  ): Promise<Subscription> {
    if (data.vendorId != null) {
      await this.vendorService.getById(data.vendorId);
    }

    const transaction = await this.sequelize.transaction();

    try {
      const subscription = await this.subscriptionRepository.create(
        {
          userId,
          amount: data.amount,
          currency: data.currency,
          billingCycle: data.billingCycle,
          vendorId: data.vendorId ?? null,
          nextChargeDate: data.nextChargeDate ?? null,
        },
        transaction,
      );

      await this.xpEventService.award(
        userId,
        XP_ACTION_KEYS.SUBSCRIPTION_ADDED,
        transaction,
      );

      await transaction.commit();

      return subscription;
    } catch (error) {
      await transaction.rollback();
      this.logger.error({ message: 'Failed to create subscription', error });

      throw error;
    }
  }

  public async update(
    id: string,
    userId: string,
    data: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    await this.getById(id, userId);

    if (data.vendorId != null) {
      await this.vendorService.getById(data.vendorId);
    }

    await this.subscriptionRepository.update(id, data);

    return this.getById(id, userId);
  }

  public async requestCancellation(
    id: string,
    userId: string,
  ): Promise<Subscription> {
    const subscription = await this.getById(id, userId);

    if (subscription.status !== TSubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Only an active subscription can be cancelled',
      );
    }

    await this.subscriptionRepository.update(id, {
      cancellationRequestedAt: new Date(),
      status: TSubscriptionStatus.CANCELLATION_REQUESTED,
    });

    return this.getById(id, userId);
  }

  public async confirmCancellation(
    id: string,
    userId: string,
  ): Promise<Subscription> {
    const subscription = await this.getById(id, userId);

    if (subscription.status === TSubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    await this.subscriptionRepository.update(id, {
      cancelledAt: new Date(),
      status: TSubscriptionStatus.CANCELLED,
    });

    return this.getById(id, userId);
  }

  public async delete(id: string, userId: string): Promise<void> {
    await this.getById(id, userId);
    await this.subscriptionRepository.softDelete(id);
  }
}
