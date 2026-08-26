import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { TokenGuard } from './token.guard';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { type IAuthenticatedRequest } from '@Interfaces/authenticated-request.interface';

const buildContext = (request: Partial<IAuthenticatedRequest>) =>
  ({
    getClass: () => class {},
    getHandler: () => () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('TokenGuard', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });
  const payload = {
    sub: 'a5f0c0de-0000-4000-8000-000000000001',
    name: 'מיכל',
    email: 'michal@ogen.co.il',
  };

  const buildGuard = (isPublic = false) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;

    return new TokenGuard(reflector, jwtService);
  };

  it('lets a public route through without a token', () => {
    const request = { headers: {} };

    expect(buildGuard(true).canActivate(buildContext(request))).toBe(true);
  });

  it('rejects a request with no authorization header', () => {
    const context = buildContext({ headers: {} });

    expect(() => buildGuard().canActivate(context)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', () => {
    const foreignToken = new JwtService({ secret: 'other-secret' }).sign(
      payload,
    );
    const request = {
      headers: { authorization: `Bearer ${foreignToken}` },
    } as IAuthenticatedRequest;

    expect(() => buildGuard().canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', () => {
    const expiredToken = jwtService.sign(payload, { expiresIn: '-1s' });
    const request = {
      headers: { authorization: `Bearer ${expiredToken}` },
    } as IAuthenticatedRequest;

    expect(() => buildGuard().canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the authenticated user to the request', () => {
    const request = {
      headers: { authorization: `Bearer ${jwtService.sign(payload)}` },
    } as IAuthenticatedRequest;

    expect(buildGuard().canActivate(buildContext(request))).toBe(true);
    expect(request.user).toEqual({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
    });
  });
});
