import { Alert } from './entities/alert.entity';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AlertRepository } from './alert.repository';
import { CreateAlertDto } from './dto/create-alert.dto';
import { TypedLogger } from '../../logger/logger.service';
import { IBatchResult } from '@Interfaces/batch.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';

@Injectable()
export class AlertService {
  private readonly logger = new TypedLogger('AlertService');

  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly transactionService: TransactionService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  public getByUser(
    userId: string,
    data: GetAlertsDto,
  ): Promise<IBatchResult<Alert>> {
    return this.alertRepository.getByUser(userId, data);
  }

  public async getById(id: string, userId: string): Promise<Alert> {
    const alert = await this.alertRepository.findById(id, userId);

    if (alert == null) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  public async create(userId: string, data: CreateAlertDto): Promise<Alert> {
    await this.assertReferencesBelongToUser(userId, data);

    try {
      return await this.alertRepository.create({ ...data, userId });
    } catch (error) {
      this.logger.error({ message: 'Failed to create alert', error });

      throw error;
    }
  }

  public async updateStatus(
    id: string,
    userId: string,
    data: UpdateAlertStatusDto,
  ): Promise<Alert> {
    await this.getById(id, userId);
    await this.alertRepository.update(id, { status: data.status });

    return this.getById(id, userId);
  }

  private async assertReferencesBelongToUser(
    userId: string,
    data: CreateAlertDto,
  ): Promise<void> {
    if (data.subscriptionId != null) {
      await this.subscriptionService.getById(data.subscriptionId, userId);
    }

    if (data.transactionId != null) {
      await this.transactionService.getById(data.transactionId, userId);
    }
  }
}
