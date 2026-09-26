import {
  TBankSyncScope,
  TBankSyncFailure,
} from './constants/bank-sync.constant';

import { randomBytes } from 'crypto';
import { TIME_UNITS } from '@Constants/date';
import { decryptSecret } from '@Utilities/secret-cipher.utility';
import { TBankCompany } from './constants/bank-company.constant';
import { BankConnectionService } from './bank-connection.service';
import { XpEventService } from '@Modules/xp-event/xp-event.service';
import { BankConnectionRepository } from './bank-connection.repository';
import { NotificationService } from '@Providers/notification/notification.service';
import { TBankConnectionStatus } from './constants/bank-connection-status.constant';
import { TScrapedTransactionStatus } from './constants/scraped-transaction.constant';
import { StatementImportService } from '@Modules/statement-import/statement-import.service';

const credentialsKey = randomBytes(32);

process.env.CREDENTIALS_ENCRYPTION_KEY = credentialsKey.toString('base64');

const buildConnection = (overrides: Record<string, unknown> = {}) => ({
  id: 'connection-1',
  userId: 'user-1',
  lastError: null,
  lastSyncedAt: null,
  otpRequestedAt: null,
  lastAttemptedAt: null,
  encryptedOtpCode: null,
  company: TBankCompany.MAX,
  encryptedCredentials: 'v1:cipher',
  createdAt: new Date('2026-01-01'),
  status: TBankConnectionStatus.SYNCING,
  ...overrides,
});

const buildRepository = (connection: unknown = buildConnection()) => ({
  claim: jest.fn().mockResolvedValue([connection]),
  create: jest
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(buildConnection(data)),
    ),
  delete: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue([1]),
  getByUser: jest.fn().mockResolvedValue([connection]),
  findById: jest.fn().mockResolvedValue(connection),
  findByIdForUser: jest.fn().mockResolvedValue(connection),
  findByUserAndCompany: jest.fn().mockResolvedValue(null),
});

const buildNotificationService = () => ({
  requestBankOtp: jest.fn().mockResolvedValue(null),
  requestBankReconnect: jest.fn().mockResolvedValue(null),
});

const buildStatementImportService = () => ({
  startBankImport: jest.fn().mockResolvedValue({ id: 'import-1' }),
});

const buildXpEventService = () => ({
  award: jest.fn().mockResolvedValue(null),
});

const buildService = (
  repository = buildRepository(),
  notificationService = buildNotificationService(),
  statementImportService = buildStatementImportService(),
  xpEventService = buildXpEventService(),
) =>
  new BankConnectionService(
    xpEventService as unknown as XpEventService,
    notificationService as unknown as NotificationService,
    statementImportService as unknown as StatementImportService,
    repository as unknown as BankConnectionRepository,
  );

describe('BankConnectionService', () => {
  describe('connect', () => {
    it('rejects a login missing a field the company requires', async () => {
      const repository = buildRepository();

      await expect(
        buildService(repository).connect('user-1', {
          company: TBankCompany.ISRACARD,
          credentials: { id: '123456789', password: 'secret' },
        }),
      ).rejects.toThrow('Missing credential field(s): card6Digits');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('stores only an encrypted cipher bound to the user, never the password', async () => {
      const repository = buildRepository();

      const summary = await buildService(repository).connect('user-1', {
        company: TBankCompany.MAX,
        credentials: { username: 'michal', password: 'hunter2' },
      });

      const [{ encryptedCredentials }] = repository.create.mock.calls[0] as [
        { encryptedCredentials: string },
      ];

      expect(encryptedCredentials).not.toContain('hunter2');
      expect(
        JSON.parse(
          decryptSecret(encryptedCredentials, {
            key: credentialsKey,
            associatedData: 'user-1',
          }),
        ),
      ).toEqual({ username: 'michal', password: 'hunter2' });
      expect(summary).not.toHaveProperty('encryptedCredentials');
    });

    it('replaces the login of an existing connection and re-validates it', async () => {
      const existing = buildConnection({
        status: TBankConnectionStatus.INVALID_CREDENTIALS,
      });
      const repository = {
        ...buildRepository(existing),
        findByUserAndCompany: jest.fn().mockResolvedValue(existing),
      };

      await buildService(repository).connect('user-1', {
        company: TBankCompany.MAX,
        credentials: { username: 'michal', password: 'new-password' },
      });

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        'connection-1',
        expect.objectContaining({
          lastError: null,
          status: TBankConnectionStatus.PENDING_VALIDATION,
        }),
      );
    });

    it('refuses to replace a login while a sync is running on it', async () => {
      const repository = {
        ...buildRepository(),
        findByUserAndCompany: jest.fn().mockResolvedValue(buildConnection()),
      };

      await expect(
        buildService(repository).connect('user-1', {
          company: TBankCompany.MAX,
          credentials: { username: 'michal', password: 'secret' },
        }),
      ).rejects.toThrow('A sync is running for this connection');
    });
  });

  describe('claim', () => {
    it('reads three months back on the first sync', async () => {
      const [claimed] = await buildService().claim(TBankSyncScope.SCHEDULED);
      const historyMs = Date.now() - claimed.startDate.getTime();

      expect(Math.round(historyMs / TIME_UNITS.DAYS)).toBe(90);
    });

    it('overlaps the previous sync by a week', async () => {
      const lastSyncedAt = new Date('2026-09-20T00:00:00.000Z');
      const repository = buildRepository(buildConnection({ lastSyncedAt }));

      const [claimed] = await buildService(repository).claim(
        TBankSyncScope.SCHEDULED,
      );

      expect(claimed.startDate).toEqual(new Date('2026-09-13T00:00:00.000Z'));
    });
  });

  describe('two-factor handoff', () => {
    it('pauses the sync and asks the user for the SMS code', async () => {
      const repository = buildRepository();
      const notificationService = buildNotificationService();

      await buildService(repository, notificationService).requestOtp(
        'connection-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'connection-1',
        expect.objectContaining({ status: TBankConnectionStatus.AWAITING_OTP }),
      );
      expect(notificationService.requestBankOtp).toHaveBeenCalledWith({
        userId: 'user-1',
        company: TBankCompany.MAX,
        bankConnectionId: 'connection-1',
      });
    });

    it('stores the submitted code encrypted', async () => {
      const repository = buildRepository(
        buildConnection({
          otpRequestedAt: new Date(),
          status: TBankConnectionStatus.AWAITING_OTP,
        }),
      );

      await buildService(repository).submitOtp('user-1', 'connection-1', {
        code: '123456',
      });

      const [, { encryptedOtpCode }] = repository.update.mock.calls[0] as [
        string,
        { encryptedOtpCode: string },
      ];

      expect(
        decryptSecret(encryptedOtpCode, {
          key: credentialsKey,
          associatedData: 'user-1',
        }),
      ).toBe('123456');
    });

    it('rejects a code sent after the request expired', async () => {
      const repository = buildRepository(
        buildConnection({
          status: TBankConnectionStatus.AWAITING_OTP,
          otpRequestedAt: new Date(Date.now() - 11 * TIME_UNITS.MINUTES),
        }),
      );

      await expect(
        buildService(repository).submitOtp('user-1', 'connection-1', {
          code: '123456',
        }),
      ).rejects.toThrow('The code request expired');
    });

    it('rejects a code when no code was requested', async () => {
      await expect(
        buildService().submitOtp('user-1', 'connection-1', { code: '123456' }),
      ).rejects.toThrow('This connection is not waiting for a code');
    });

    it('hands the code to the worker once and resumes the sync', async () => {
      const repository = buildRepository(
        buildConnection({
          encryptedOtpCode: 'v1:otp',
          status: TBankConnectionStatus.AWAITING_OTP,
        }),
      );

      const pendingOtp = await buildService(repository).takeOtp('connection-1');

      expect(pendingOtp).toEqual({ encryptedOtpCode: 'v1:otp' });
      expect(repository.update).toHaveBeenCalledWith('connection-1', {
        otpRequestedAt: null,
        encryptedOtpCode: null,
        status: TBankConnectionStatus.SYNCING,
      });
    });

    it('tells the worker to keep waiting while no code arrived', async () => {
      const repository = buildRepository(
        buildConnection({ status: TBankConnectionStatus.AWAITING_OTP }),
      );

      const pendingOtp = await buildService(repository).takeOtp('connection-1');

      expect(pendingOtp).toEqual({ encryptedOtpCode: null });
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('sync results', () => {
    it('imports the scraped charges and marks the connection active', async () => {
      const repository = buildRepository();
      const statementImportService = buildStatementImportService();

      await buildService(
        repository,
        buildNotificationService(),
        statementImportService,
      ).reportSuccess('connection-1', {
        accounts: [
          {
            accountNumber: '4580',
            txns: [
              {
                identifier: '1',
                chargedAmount: -42,
                description: 'RAMI LEVY',
                date: '2026-09-01T09:00:00.000Z',
                status: TScrapedTransactionStatus.COMPLETED,
              },
            ],
          },
        ],
      });

      expect(statementImportService.startBankImport).toHaveBeenCalledWith(
        'user-1',
        {
          rowErrors: [],
          bankConnectionId: 'connection-1',
          rows: [
            {
              amount: '42.00',
              currency: 'ILS',
              transactionDate: '2026-09-01',
              externalId: 'max:4580:1',
              originalDescription: 'RAMI LEVY',
            },
          ],
        },
      );
      expect(repository.update).toHaveBeenCalledWith(
        'connection-1',
        expect.objectContaining({ status: TBankConnectionStatus.ACTIVE }),
      );
    });

    it('awards the connection XP on the first successful sync only', async () => {
      const firstXpEventService = buildXpEventService();
      const resyncXpEventService = buildXpEventService();
      const report = { accounts: [] };

      await buildService(
        buildRepository(),
        buildNotificationService(),
        buildStatementImportService(),
        firstXpEventService,
      ).reportSuccess('connection-1', report);
      await buildService(
        buildRepository(buildConnection({ lastSyncedAt: new Date() })),
        buildNotificationService(),
        buildStatementImportService(),
        resyncXpEventService,
      ).reportSuccess('connection-1', report);

      expect(firstXpEventService.award).toHaveBeenCalledWith(
        'user-1',
        'BANK_CONNECTED',
      );
      expect(resyncXpEventService.award).not.toHaveBeenCalled();
    });

    it('still reports the sync as done when the XP award fails', async () => {
      const repository = buildRepository();
      const xpEventService = {
        award: jest.fn().mockRejectedValue(new Error('db is down')),
      };

      await expect(
        buildService(
          repository,
          buildNotificationService(),
          buildStatementImportService(),
          xpEventService,
        ).reportSuccess('connection-1', { accounts: [] }),
      ).resolves.toEqual({ id: 'import-1' });
      expect(repository.update).toHaveBeenCalledWith(
        'connection-1',
        expect.objectContaining({ status: TBankConnectionStatus.ACTIVE }),
      );
    });

    it('parks a rejected login and asks the user to reconnect', async () => {
      const repository = buildRepository();
      const notificationService = buildNotificationService();

      await buildService(repository, notificationService).reportFailure(
        'connection-1',
        { reason: TBankSyncFailure.INVALID_CREDENTIALS },
      );

      expect(repository.update).toHaveBeenCalledWith(
        'connection-1',
        expect.objectContaining({
          status: TBankConnectionStatus.INVALID_CREDENTIALS,
        }),
      );
      expect(notificationService.requestBankReconnect).toHaveBeenCalled();
    });

    it('leaves a transient failure for the next scheduled run', async () => {
      const repository = buildRepository();
      const notificationService = buildNotificationService();

      await buildService(repository, notificationService).reportFailure(
        'connection-1',
        { reason: TBankSyncFailure.UNKNOWN, message: 'Timeout' },
      );

      expect(repository.update).toHaveBeenCalledWith(
        'connection-1',
        expect.objectContaining({
          lastError: 'Timeout',
          status: TBankConnectionStatus.FAILED,
        }),
      );
      expect(notificationService.requestBankReconnect).not.toHaveBeenCalled();
    });

    it('ignores a late report for a connection the worker no longer holds', async () => {
      const repository = buildRepository(
        buildConnection({ status: TBankConnectionStatus.ACTIVE }),
      );

      await expect(
        buildService(repository).reportFailure('connection-1', {
          reason: TBankSyncFailure.UNKNOWN,
        }),
      ).rejects.toThrow('Bank connection is not being synced');
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
