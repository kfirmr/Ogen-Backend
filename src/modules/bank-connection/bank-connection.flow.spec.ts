import request from 'supertest';
import { randomBytes } from 'crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import { ProviderNames } from '@Providers/database/provider-names';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { BankConnectionRepository } from './bank-connection.repository';
import { TBankConnectionStatus } from './constants/bank-connection-status.constant';
import { StatementImportService } from '@Modules/statement-import/statement-import.service';

const USER_ID = 'a5f0c0de-0000-4000-8000-000000000001';
const CONNECTION_ID = 'b6f0c0de-0000-4000-8000-000000000002';
const WORKER_API_KEY = 'worker-flow-secret';

const storedConnection = {
  id: CONNECTION_ID,
  userId: USER_ID,
  company: 'max',
  lastError: null,
  lastSyncedAt: null,
  otpRequestedAt: null,
  encryptedOtpCode: null,
  encryptedCredentials: 'v1:iv:tag:cipher',
  createdAt: new Date('2026-09-26T00:00:00.000Z'),
  status: TBankConnectionStatus.SYNCING,
};

describe('Bank connection flow (e2e)', () => {
  const repositoryStub = {
    update: jest.fn().mockResolvedValue([1]),
    claim: jest.fn().mockResolvedValue([storedConnection]),
    findById: jest.fn().mockResolvedValue(storedConnection),
    findByIdForUser: jest.fn().mockResolvedValue(storedConnection),
    findByUserAndCompany: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation((data: object) =>
        Promise.resolve({ ...storedConnection, ...data }),
      ),
  };
  const statementImportStub = {
    startBankImport: jest
      .fn()
      .mockResolvedValue({ id: 'import-1', status: 'PROCESSING' }),
  };

  let app: INestApplication;
  let userToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret';
    process.env.WORKER_API_KEY = WORKER_API_KEY;
    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString('base64');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ProviderNames.SEQUELIZE)
      .useValue({})
      .overrideProvider(BankConnectionRepository)
      .useValue(repositoryStub)
      .overrideProvider(StatementImportService)
      .useValue(statementImportStub)
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    userToken = app.get(JwtService).sign({
      sub: USER_ID,
      name: 'מיכל',
      email: 'michal@ogen.co.il',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /bank-connection', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .post('/bank-connection')
        .send({ company: 'max', credentials: {} });

      expect(response.status).toBe(401);
    });

    it('rejects an unknown company', async () => {
      const response = await request(app.getHttpServer())
        .post('/bank-connection')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ company: 'fakeBank', credentials: { password: 'x' } });

      expect(response.status).toBe(400);
    });

    it('connects a bank without echoing the encrypted login', async () => {
      const response = await request(app.getHttpServer())
        .post('/bank-connection')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          company: 'max',
          credentials: { username: 'michal', password: 'hunter2' },
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({ id: CONNECTION_ID, company: 'max' }),
      );
      expect(JSON.stringify(response.body)).not.toMatch(/encrypted|hunter2/);
    });
  });

  describe('GET /bank-connection/:id', () => {
    it('returns the connection status the client polls', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bank-connection/${CONNECTION_ID}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({ id: CONNECTION_ID, status: 'SYNCING' }),
      );
      expect(JSON.stringify(response.body)).not.toContain('encrypted');
    });
  });

  describe('POST /bank-connection/:id/otp', () => {
    it('rejects a code that is not 4-8 digits', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bank-connection/${CONNECTION_ID}/otp`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: '12ab' });

      expect(response.status).toBe(400);
    });
  });

  describe('/bank-sync (worker only)', () => {
    it('rejects a user token', async () => {
      const response = await request(app.getHttpServer())
        .post('/bank-sync/claim')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ scope: 'SCHEDULED' });

      expect(response.status).toBe(401);
    });

    it('rejects a wrong worker token', async () => {
      const response = await request(app.getHttpServer())
        .post('/bank-sync/claim')
        .set('between-services-token', 'guess')
        .send({ scope: 'SCHEDULED' });

      expect(response.status).toBe(401);
    });

    it('hands the worker the encrypted login and its sync window', async () => {
      const response = await request(app.getHttpServer())
        .post('/bank-sync/claim')
        .set('between-services-token', WORKER_API_KEY)
        .send({ scope: 'SCHEDULED' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual([
        {
          id: CONNECTION_ID,
          userId: USER_ID,
          company: 'max',
          startDate: expect.any(String) as string,
          encryptedCredentials: 'v1:iv:tag:cipher',
        },
      ]);
    });

    it('rejects scraped transactions with a malformed amount', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bank-sync/${CONNECTION_ID}/success`)
        .set('between-services-token', WORKER_API_KEY)
        .send({
          accounts: [
            {
              accountNumber: '4580',
              txns: [
                {
                  date: '2026-09-01T09:00:00.000Z',
                  chargedAmount: 'lots',
                  description: 'RAMI LEVY',
                  status: 'completed',
                },
              ],
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('starts an import from the scraped transactions', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bank-sync/${CONNECTION_ID}/success`)
        .set('between-services-token', WORKER_API_KEY)
        .send({
          accounts: [
            {
              accountNumber: '4580',
              txns: [
                {
                  identifier: '77',
                  date: '2026-09-01T09:00:00.000Z',
                  chargedAmount: -42,
                  chargedCurrency: 'ILS',
                  description: 'RAMI LEVY',
                  status: 'completed',
                },
              ],
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: 'import-1', status: 'PROCESSING' });
      expect(statementImportStub.startBankImport).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          rows: [expect.objectContaining({ externalId: 'max:4580:77' })],
        }),
      );
    });
  });
});
