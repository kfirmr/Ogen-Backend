import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  TBankSyncScope,
  BANK_CONNECTION_STATUS_BY_FAILURE,
} from './constants/bank-sync.constant';

import {
  encryptSecret,
  parseSecretKey,
} from '@Utilities/secret-cipher.utility';

import {
  isOtpExpired,
  toBankConnectionSummary,
  toClaimedBankConnection,
} from './utilities/bank-connection.utility';

import {
  pickCompanyCredentials,
  findMissingCredentialFields,
} from './utilities/bank-credentials.utility';

import {
  IPendingBankOtp,
  TBankConnectionSummary,
  IClaimedBankConnection,
} from './interfaces/bank-connection.interface';

import {
  TBankConnectionStatus,
  IN_FLIGHT_BANK_CONNECTION_STATUSES,
} from './constants/bank-connection-status.constant';

import { TypedLogger } from '../../logger/logger.service';
import { ENCRYPTION_ENV_KEYS } from '@Constants/encryption';
import { SubmitBankOtpDto } from './dto/submit-bank-otp.dto';
import { BankConnection } from './entities/bank-connection.entity';
import { XP_ACTION_KEYS } from '@Constants/xp-action-keys.constant';
import { XpEventService } from '@Modules/xp-event/xp-event.service';
import { toImportRows } from './utilities/scraped-transaction.utility';
import { BankConnectionRepository } from './bank-connection.repository';
import { CreateBankConnectionDto } from './dto/create-bank-connection.dto';
import { EnvironmentManager } from '@Utilities/environment-manager.utility';
import { ReportBankSyncSuccessDto } from './dto/report-bank-sync-success.dto';
import { ReportBankSyncFailureDto } from './dto/report-bank-sync-failure.dto';
import { NotificationService } from '@Providers/notification/notification.service';
import { StatementImportService } from '@Modules/statement-import/statement-import.service';
import { StatementImport } from '@Modules/statement-import/entities/statement-import.entity';

const CLEARED_OTP = { encryptedOtpCode: null, otpRequestedAt: null } as const;

@Injectable()
export class BankConnectionService {
  private readonly logger = new TypedLogger('BankConnectionService');

  private readonly credentialsKey = parseSecretKey(
    EnvironmentManager.get(ENCRYPTION_ENV_KEYS.CREDENTIALS_KEY, {
      errorOnMissing: true,
    }),
  );

  constructor(
    private readonly xpEventService: XpEventService,
    private readonly notificationService: NotificationService,
    private readonly statementImportService: StatementImportService,
    private readonly bankConnectionRepository: BankConnectionRepository,
  ) {}

  public async getByUser(userId: string): Promise<TBankConnectionSummary[]> {
    const connections = await this.bankConnectionRepository.getByUser(userId);

    return connections.map(toBankConnectionSummary);
  }

  // Credentials are encrypted before they reach the database and are only ever decrypted in the
  // worker's memory; entering them again for a company replaces the old login and re-validates.
  public async connect(
    userId: string,
    data: CreateBankConnectionDto,
  ): Promise<TBankConnectionSummary> {
    const missingFields = findMissingCredentialFields(
      data.company,
      data.credentials,
    );

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing credential field(s): ${missingFields.join(', ')}`,
      );
    }

    const encryptedCredentials = encryptSecret(
      JSON.stringify(pickCompanyCredentials(data.company, data.credentials)),
      { key: this.credentialsKey, associatedData: userId },
    );
    const existingConnection =
      await this.bankConnectionRepository.findByUserAndCompany(
        userId,
        data.company,
      );

    if (existingConnection === null) {
      const connection = await this.bankConnectionRepository.create({
        userId,
        encryptedCredentials,
        company: data.company,
      });

      return toBankConnectionSummary(connection);
    }

    this.assertNotInFlight(existingConnection);

    await this.bankConnectionRepository.update(existingConnection.id, {
      ...CLEARED_OTP,
      lastError: null,
      encryptedCredentials,
      status: TBankConnectionStatus.PENDING_VALIDATION,
    });

    return this.getSummary(existingConnection.id, userId);
  }

  public getById(id: string, userId: string): Promise<TBankConnectionSummary> {
    return this.getSummary(id, userId);
  }

  public async disconnect(userId: string, id: string): Promise<void> {
    const deletedCount = await this.bankConnectionRepository.delete(id, userId);

    if (deletedCount === 0) {
      throw new NotFoundException('Bank connection not found');
    }
  }

  public async submitOtp(
    userId: string,
    id: string,
    data: SubmitBankOtpDto,
  ): Promise<TBankConnectionSummary> {
    const connection = await this.getOwned(id, userId);

    if (connection.status !== TBankConnectionStatus.AWAITING_OTP) {
      throw new BadRequestException(
        'This connection is not waiting for a code',
      );
    }

    if (isOtpExpired(connection, new Date())) {
      throw new BadRequestException('The code request expired');
    }

    await this.bankConnectionRepository.update(id, {
      encryptedOtpCode: encryptSecret(data.code, {
        key: this.credentialsKey,
        associatedData: userId,
      }),
    });

    return this.getSummary(id, userId);
  }

  public async claim(scope: TBankSyncScope): Promise<IClaimedBankConnection[]> {
    const now = new Date();
    const connections = await this.bankConnectionRepository.claim(scope, now);

    return connections.map((connection) =>
      toClaimedBankConnection(connection, now),
    );
  }

  // The worker keeps its browser session open while the user reads the SMS, so this only flags
  // the connection and notifies; the code comes back through submitOtp and takeOtp.
  public async requestOtp(id: string): Promise<void> {
    const connection = await this.getInFlight(id);

    await this.bankConnectionRepository.update(id, {
      encryptedOtpCode: null,
      otpRequestedAt: new Date(),
      status: TBankConnectionStatus.AWAITING_OTP,
    });

    await this.notificationService.requestBankOtp({
      userId: connection.userId,
      company: connection.company,
      bankConnectionId: connection.id,
    });
  }

  // A code is handed out once: it is cleared as it is read so a retried poll can never replay it.
  public async takeOtp(id: string): Promise<IPendingBankOtp> {
    const connection = await this.getInFlight(id);

    if (connection.encryptedOtpCode === null) {
      return { encryptedOtpCode: null };
    }

    await this.bankConnectionRepository.update(id, {
      ...CLEARED_OTP,
      status: TBankConnectionStatus.SYNCING,
    });

    return { encryptedOtpCode: connection.encryptedOtpCode };
  }

  public async reportSuccess(
    id: string,
    data: ReportBankSyncSuccessDto,
  ): Promise<StatementImport> {
    const connection = await this.getInFlight(id);
    const { rows, rowErrors } = toImportRows(connection.company, data.accounts);

    const statementImport = await this.statementImportService.startBankImport(
      connection.userId,
      { rows, rowErrors, bankConnectionId: connection.id },
    );

    await this.bankConnectionRepository.update(id, {
      ...CLEARED_OTP,
      lastError: null,
      lastSyncedAt: new Date(),
      status: TBankConnectionStatus.ACTIVE,
    });

    if (connection.lastSyncedAt === null) {
      await this.awardFirstConnection(connection);
    }

    return statementImport;
  }

  public async reportFailure(
    id: string,
    data: ReportBankSyncFailureDto,
  ): Promise<void> {
    const connection = await this.getInFlight(id);
    const status = BANK_CONNECTION_STATUS_BY_FAILURE[data.reason];

    this.logger.info({
      status,
      reason: data.reason,
      bankConnectionId: id,
      message: 'Bank sync failed',
    });

    await this.bankConnectionRepository.update(id, {
      ...CLEARED_OTP,
      status,
      lastError: data.message ?? data.reason,
    });

    if (status !== TBankConnectionStatus.INVALID_CREDENTIALS) {
      return;
    }

    await this.notificationService.requestBankReconnect({
      userId: connection.userId,
      company: connection.company,
      bankConnectionId: connection.id,
    });
  }

  // Re-entering a login keeps lastSyncedAt, so only the very first successful sync earns the XP.
  // The sync itself already succeeded, so a failed award is logged rather than failing the report.
  private async awardFirstConnection(
    connection: BankConnection,
  ): Promise<void> {
    try {
      await this.xpEventService.award(
        connection.userId,
        XP_ACTION_KEYS.BANK_CONNECTED,
      );
    } catch (error) {
      this.logger.error({
        error,
        bankConnectionId: connection.id,
        message: 'Failed to award XP for a new bank connection',
      });
    }
  }

  private async getOwned(id: string, userId: string): Promise<BankConnection> {
    const connection = await this.bankConnectionRepository.findByIdForUser(
      id,
      userId,
    );

    if (connection === null) {
      throw new NotFoundException('Bank connection not found');
    }

    return connection;
  }

  private async getSummary(
    id: string,
    userId: string,
  ): Promise<TBankConnectionSummary> {
    return toBankConnectionSummary(await this.getOwned(id, userId));
  }

  // Worker calls are only valid while the worker holds the claim; anything else is a late report
  // from an abandoned run, or a connection the user already removed or re-entered.
  private async getInFlight(id: string): Promise<BankConnection> {
    const connection = await this.bankConnectionRepository.findById(id);

    if (connection === null) {
      throw new NotFoundException('Bank connection not found');
    }

    if (!IN_FLIGHT_BANK_CONNECTION_STATUSES.includes(connection.status)) {
      throw new ConflictException('Bank connection is not being synced');
    }

    return connection;
  }

  private assertNotInFlight(connection: BankConnection): void {
    if (IN_FLIGHT_BANK_CONNECTION_STATUSES.includes(connection.status)) {
      throw new ConflictException('A sync is running for this connection');
    }
  }
}
