import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit-guard';
import { type ExecutionContext } from '@nestjs/common';
import { type IAuthenticatedRequest } from '@Interfaces/authenticated-request.interface';

const buildContext = (request: Partial<IAuthenticatedRequest>) =>
  ({
    getClass: () => class {},
    getHandler: () => () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const buildGuard = (maxRequests?: number) => {
  const reflector = {
    get: jest.fn().mockReturnValue(maxRequests),
  } as unknown as Reflector;

  return new RateLimitGuard(reflector);
};

describe('RateLimitGuard', () => {
  it('allows an anonymous request by falling back to the client address', () => {
    const request = {
      ip: '10.0.0.1',
      originalUrl: '/auth/login',
    } as IAuthenticatedRequest;

    expect(buildGuard(3).canActivate(buildContext(request))).toBe(true);
  });

  it('blocks an anonymous caller once the configured limit is exceeded', () => {
    const guard = buildGuard(3);
    const context = buildContext({
      ip: '10.0.0.2',
      originalUrl: '/auth/login',
    });

    const results = [1, 2, 3, 4].map(() => guard.canActivate(context));

    expect(results).toEqual([true, true, true, false]);
  });

  it('counts each route separately', () => {
    const guard = buildGuard(1);
    const login = buildContext({
      ip: '10.0.0.3',
      originalUrl: '/auth/login',
    });
    const signUp = buildContext({
      ip: '10.0.0.3',
      originalUrl: '/auth/sign-up',
    });

    expect(guard.canActivate(login)).toBe(true);
    expect(guard.canActivate(signUp)).toBe(true);
    expect(guard.canActivate(login)).toBe(false);
  });

  it('counts an authenticated caller by user rather than address', () => {
    const guard = buildGuard(1);
    const first = buildContext({
      ip: '10.0.0.4',
      originalUrl: '/user/me',
      user: { id: 'user-a', email: 'a@ogen.co.il', name: 'A' },
    });
    const second = buildContext({
      ip: '10.0.0.4',
      originalUrl: '/user/me',
      user: { id: 'user-b', email: 'b@ogen.co.il', name: 'B' },
    });

    expect(guard.canActivate(first)).toBe(true);
    expect(guard.canActivate(second)).toBe(true);
    expect(guard.canActivate(first)).toBe(false);
  });
});
