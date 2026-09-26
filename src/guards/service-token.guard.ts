import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { HEADERS } from '@Constants/headers';
import { createHash, timingSafeEqual } from 'crypto';
import { SERVICE_TOKEN_ENV_KEYS } from '@Constants/service-token';
import { EnvironmentManager } from '@Utilities/environment-manager.utility';

const hashToken = (token: string): Buffer =>
  createHash('sha256').update(token).digest();

// Guards the endpoints only the bank-scraper worker may call; hashing both sides first keeps the
// comparison constant-time regardless of the presented token's length.
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const presentedToken = request.header(HEADERS.BETWEEN_SERVICES_TOKEN);
    const expectedToken = EnvironmentManager.get(
      SERVICE_TOKEN_ENV_KEYS.WORKER_API_KEY,
      { errorOnMissing: true },
    );

    if (presentedToken == null) {
      throw new UnauthorizedException();
    }

    if (!timingSafeEqual(hashToken(presentedToken), hashToken(expectedToken))) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
