import {
  TBankSyncScope,
  BANK_SYNC_WINDOWS,
} from './constants/bank-sync.constant';

import {
  IBankConnection,
  TCreateBankConnection,
} from './interfaces/bank-connection.interface';

import {
  TBankConnectionStatus,
  IN_FLIGHT_BANK_CONNECTION_STATUSES,
  SCHEDULABLE_BANK_CONNECTION_STATUSES,
} from './constants/bank-connection-status.constant';

import { Injectable } from '@nestjs/common';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { TBankCompany } from './constants/bank-company.constant';
import { BankConnection } from './entities/bank-connection.entity';

type TClaimConditionBuilder = (now: Date) => WhereOptions<BankConnection>;

const millisecondsBefore = (now: Date, durationMs: number): Date =>
  new Date(now.getTime() - durationMs);

@Injectable()
export class BankConnectionRepository {
  private readonly claimConditionsByScope: Record<
    TBankSyncScope,
    TClaimConditionBuilder
  > = {
    [TBankSyncScope.PENDING_VALIDATION]: () => ({
      status: TBankConnectionStatus.PENDING_VALIDATION,
    }),
    [TBankSyncScope.SCHEDULED]: (now) => ({
      [Op.or]: [
        this.buildDueForSyncCondition(now),
        this.buildAbandonedClaimCondition(now),
      ],
    }),
  };

  public findById(id: string): Promise<BankConnection | null> {
    return BankConnection.findByPk(id);
  }

  public findByIdForUser(
    id: string,
    userId: string,
  ): Promise<BankConnection | null> {
    return BankConnection.findOne({ where: { id, userId } });
  }

  public findByUserAndCompany(
    userId: string,
    company: TBankCompany,
  ): Promise<BankConnection | null> {
    return BankConnection.findOne({ where: { userId, company } });
  }

  public getByUser(userId: string): Promise<BankConnection[]> {
    return BankConnection.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
    });
  }

  public create(
    data: TCreateBankConnection,
    transaction?: Transaction,
  ): Promise<BankConnection> {
    return BankConnection.create(data, { transaction });
  }

  public update(
    id: string,
    data: Partial<IBankConnection>,
    transaction?: Transaction,
  ): Promise<[number]> {
    return BankConnection.update(data, { where: { id }, transaction });
  }

  public delete(
    id: string,
    userId: string,
    transaction?: Transaction,
  ): Promise<number> {
    return BankConnection.destroy({ where: { id, userId }, transaction });
  }

  // A single UPDATE ... RETURNING moves every due row to SYNCING, so two worker ticks can never
  // both claim the same connection.
  public async claim(
    scope: TBankSyncScope,
    now: Date,
  ): Promise<BankConnection[]> {
    const [, claimedConnections] = await BankConnection.update(
      {
        lastAttemptedAt: now,
        encryptedOtpCode: null,
        status: TBankConnectionStatus.SYNCING,
      },
      { where: this.claimConditionsByScope[scope](now), returning: true },
    );

    return claimedConnections;
  }

  private buildDueForSyncCondition(now: Date): WhereOptions<BankConnection> {
    const syncedBefore = millisecondsBefore(
      now,
      BANK_SYNC_WINDOWS.MIN_SYNC_INTERVAL_MS,
    );

    return {
      status: { [Op.in]: SCHEDULABLE_BANK_CONNECTION_STATUSES },
      [Op.and]: [
        {
          [Op.or]: [
            { lastSyncedAt: null },
            { lastSyncedAt: { [Op.lt]: syncedBefore } },
          ],
        },
        {
          [Op.or]: [
            { lastAttemptedAt: null },
            { lastAttemptedAt: { [Op.lt]: syncedBefore } },
          ],
        },
      ],
    };
  }

  // A worker that crashed mid-scrape leaves its claim behind; once it is older than any real
  // scrape could take, the connection becomes claimable again.
  private buildAbandonedClaimCondition(
    now: Date,
  ): WhereOptions<BankConnection> {
    return {
      status: { [Op.in]: IN_FLIGHT_BANK_CONNECTION_STATUSES },
      lastAttemptedAt: {
        [Op.lt]: millisecondsBefore(now, BANK_SYNC_WINDOWS.STALE_CLAIM_MS),
      },
    };
  }
}
