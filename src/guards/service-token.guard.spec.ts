import { ExecutionContext } from '@nestjs/common';
import { ServiceTokenGuard } from './service-token.guard';

process.env.WORKER_API_KEY = 'worker-secret';

const buildContext = (token: string | null) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ header: () => token }),
    }),
  }) as unknown as ExecutionContext;

describe('ServiceTokenGuard', () => {
  const guard = new ServiceTokenGuard();

  it('lets the worker through with the shared token', () => {
    expect(guard.canActivate(buildContext('worker-secret'))).toBe(true);
  });

  it('rejects a wrong token', () => {
    expect(() => guard.canActivate(buildContext('guess'))).toThrow();
  });

  it('rejects a request without a token', () => {
    expect(() => guard.canActivate(buildContext(null))).toThrow();
  });
});
