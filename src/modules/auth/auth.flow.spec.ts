import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { UserService } from '@Modules/user/user.service';
import { User } from '@Modules/user/entities/user.entity';
import { hashPassword } from '@Utilities/password.utility';
import { ProviderNames } from '@Providers/database/provider-names';
import { ValidationPipe, type INestApplication } from '@nestjs/common';

const PASSWORD = 'correct-horse-battery';

const buildStoredUser = () =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000001',
    email: 'michal@ogen.co.il',
    fullName: 'מיכל',
    passwordHash: hashPassword(PASSWORD),
  }) as User;

describe('Auth flow (e2e)', () => {
  const storedUser = buildStoredUser();

  const userServiceStub = {
    getById: jest.fn().mockResolvedValue(storedUser),
    create: jest.fn().mockResolvedValue(storedUser),
    verifyCredentials: jest
      .fn()
      .mockImplementation((email: string, password: string) => {
        const isMatching = email === storedUser.email && password === PASSWORD;

        return Promise.resolve(isMatching ? storedUser : null);
      }),
  };

  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ProviderNames.SEQUELIZE)
      .useValue({})
      .overrideProvider(UserService)
      .useValue(userServiceStub)
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/sign-up', () => {
    it('returns a token and the user without the password hash', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          email: storedUser.email,
          fullName: storedUser.fullName,
          password: PASSWORD,
        });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user).toEqual({
        id: storedUser.id,
        email: storedUser.email,
        fullName: storedUser.fullName,
      });
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('rejects a weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({ email: storedUser.email, fullName: 'מיכל', password: 'short' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: storedUser.email, password: PASSWORD });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toEqual(expect.any(String));
    });

    it('rejects wrong credentials with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: storedUser.email, password: 'wrong-password' });

      expect(response.status).toBe(401);
    });
  });

  describe('protected routes', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app.getHttpServer()).get('/user/me');

      expect(response.status).toBe(401);
    });

    it('accepts the token issued by login', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: storedUser.email, password: PASSWORD });

      const response = await request(app.getHttpServer())
        .get('/user/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`);

      expect(response.status).toBe(200);
      expect(userServiceStub.getById).toHaveBeenCalledWith(storedUser.id);
    });

    it('rejects a tampered token', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/me')
        .set('Authorization', 'Bearer not.a.real.token');

      expect(response.status).toBe(401);
    });

    it('keeps the health route public', async () => {
      const response = await request(app.getHttpServer()).get('/');

      expect(response.status).toBe(200);
    });
  });
});
