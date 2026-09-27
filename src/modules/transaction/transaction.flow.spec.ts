import request from 'supertest';
import { randomBytes } from 'crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import { TransactionRepository } from './transaction.repository';
import { ProviderNames } from '@Providers/database/provider-names';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { SubscriptionRepository } from '@Modules/subscription/subscription.repository';

const USER_ID = 'a5f0c0de-0000-4000-8000-000000000001';
const SEPTEMBER = { fromDate: '2026-09-01', toDate: '2026-09-30' };
const NETFLIX = {
  id: 'b1f0c0de-0000-4000-8000-000000000001',
  amount: '89.80',
  status: 'ACTIVE',
  vendor: { name: 'Netflix', category: 'STREAMING' },
};

describe('Transaction summary flow (e2e)', () => {
  const repositoryStub = {
    getCategorySpend: jest.fn().mockResolvedValue([
      { category: 'STREAMING', amount: '89.80', nonSubscriptionAmount: '0' },
      {
        category: 'GROCERIES',
        amount: '1432.40',
        nonSubscriptionAmount: '1432.40',
      },
    ]),
    getSubscriptionCharges: jest
      .fn()
      .mockResolvedValue([{ subscriptionId: NETFLIX.id, amount: '89.80' }]),
  };
  const subscriptionRepositoryStub = {
    findByIds: jest.fn().mockResolvedValue([NETFLIX]),
  };

  let app: INestApplication;
  let userToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret';
    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString('base64');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ProviderNames.SEQUELIZE)
      .useValue({})
      .overrideProvider(TransactionRepository)
      .useValue(repositoryStub)
      .overrideProvider(SubscriptionRepository)
      .useValue(subscriptionRepositoryStub)
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

  describe('POST /transaction/summary', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .post('/transaction/summary')
        .send(SEPTEMBER);

      expect(response.status).toBe(401);
    });

    it('rejects a request without a date range', async () => {
      const response = await request(app.getHttpServer())
        .post('/transaction/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fromDate: SEPTEMBER.fromDate });

      expect(response.status).toBe(400);
    });

    it("returns the month's totals for the signed-in user", async () => {
      const response = await request(app.getHttpServer())
        .post('/transaction/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .send(SEPTEMBER);

      expect(response.status).toBe(201);
      expect(repositoryStub.getCategorySpend).toHaveBeenCalledWith(
        USER_ID,
        SEPTEMBER,
      );
      expect(subscriptionRepositoryStub.findByIds).toHaveBeenCalledWith(
        USER_ID,
        [NETFLIX.id],
      );
      expect(response.body).toEqual({
        nonSubscriptionAmount: '1432.40',
        subscriptionCharges: [{ amount: '89.80', subscription: NETFLIX }],
        categories: [
          { category: 'GROCERIES', amount: '1432.40' },
          { category: 'STREAMING', amount: '89.80' },
        ],
      });
    });
  });
});
