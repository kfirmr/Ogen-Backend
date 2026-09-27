import request from 'supertest';
import { randomBytes } from 'crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import { TransactionRepository } from './transaction.repository';
import { ProviderNames } from '@Providers/database/provider-names';
import { ValidationPipe, type INestApplication } from '@nestjs/common';

const USER_ID = 'a5f0c0de-0000-4000-8000-000000000001';
const SEPTEMBER = { fromDate: '2026-09-01', toDate: '2026-09-30' };

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
      expect(response.body).toEqual({
        nonSubscriptionAmount: '1432.40',
        categories: [
          { category: 'GROCERIES', amount: '1432.40' },
          { category: 'STREAMING', amount: '89.80' },
        ],
      });
    });
  });
});
