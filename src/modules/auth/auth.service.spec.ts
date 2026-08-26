import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '@Modules/user/user.service';
import { User } from '@Modules/user/entities/user.entity';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

const buildUser = () =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000001',
    email: 'michal@ogen.co.il',
    fullName: 'מיכל',
    passwordHash: 'salt:hash',
  }) as User;

describe('AuthService', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });

  const buildUserService = (overrides: Partial<UserService>) =>
    ({
      create: jest.fn(),
      verifyCredentials: jest.fn(),
      ...overrides,
    }) as unknown as UserService;

  describe('signUp', () => {
    it('creates the user and returns a signed token', async () => {
      const user = buildUser();
      const userService = buildUserService({
        create: jest.fn().mockResolvedValue(user),
      });
      const authService = new AuthService(jwtService, userService);

      const result = await authService.signUp({
        email: user.email,
        fullName: user.fullName,
        password: 'correct-horse-battery',
      });

      expect(result.accessToken).toEqual(expect.any(String));
      expect(jwtService.verify(result.accessToken)).toEqual(
        expect.objectContaining({ sub: user.id, email: user.email }),
      );
    });

    it('never returns the password hash', async () => {
      const user = buildUser();
      const userService = buildUserService({
        create: jest.fn().mockResolvedValue(user),
      });
      const authService = new AuthService(jwtService, userService);

      const result = await authService.signUp({
        email: user.email,
        fullName: user.fullName,
        password: 'correct-horse-battery',
      });

      expect(JSON.stringify(result.user)).not.toContain('salt:hash');
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      });
    });

    it('propagates a duplicate email conflict', async () => {
      const userService = buildUserService({
        create: jest.fn().mockRejectedValue(new ConflictException()),
      });
      const authService = new AuthService(jwtService, userService);

      await expect(
        authService.signUp({
          email: 'taken@ogen.co.il',
          fullName: 'מיכל',
          password: 'correct-horse-battery',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a signed token for valid credentials', async () => {
      const user = buildUser();
      const userService = buildUserService({
        verifyCredentials: jest.fn().mockResolvedValue(user),
      });
      const authService = new AuthService(jwtService, userService);

      const result = await authService.login({
        email: user.email,
        password: 'correct-horse-battery',
      });

      expect(jwtService.verify(result.accessToken)).toEqual(
        expect.objectContaining({ sub: user.id }),
      );
    });

    it('rejects wrong credentials without revealing which field failed', async () => {
      const userService = buildUserService({
        verifyCredentials: jest.fn().mockResolvedValue(null),
      });
      const authService = new AuthService(jwtService, userService);

      await expect(
        authService.login({
          email: 'michal@ogen.co.il',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
