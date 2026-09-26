import { Injectable } from '@nestjs/common';
import { TypedLogger } from '../../logger/logger.service';

interface IBankNotification {
  userId: string;
  company: string;
  bankConnectionId: string;
}

// TODO(push-notifications): no device registration or push provider exists yet, so these only
// log; the bank-sync flow already calls them at the points a push must fire.
@Injectable()
export class NotificationService {
  private readonly logger = new TypedLogger('NotificationService');

  public requestBankOtp(notification: IBankNotification): Promise<void> {
    this.logger.info({
      ...notification,
      message:
        "Ogen is trying to refresh your insights. Tap here to enter your bank's SMS code.",
    });

    return Promise.resolve();
  }

  public requestBankReconnect(notification: IBankNotification): Promise<void> {
    this.logger.info({
      ...notification,
      message: 'Your bank login changed. Tap here to reconnect Ogen.',
    });

    return Promise.resolve();
  }
}
