import {
  Logger,
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import {
  ANONYMOUS_CALLER,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_REFRESH_TIME,
} from '@Constants/rate-limit';

import { Reflector } from '@nestjs/core';
import { METADATA_KEYS } from '@Constants/metadata-keys';
import { IRateLimitRecord } from '@Interfaces/rate-limit.interface';
import { IAuthenticatedRequest } from '@Interfaces/authenticated-request.interface';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  private history = new Map<string, IRateLimitRecord>();
  private readonly logger = new Logger(RateLimitGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const httpConnection = context.switchToHttp();
    const request: IAuthenticatedRequest = httpConnection.getRequest();
    const contextHandler = context.getHandler();

    const MAX_REQUESTS =
      this.reflector.get<number>(METADATA_KEYS.MAX_REQUESTS, contextHandler) ||
      DEFAULT_RATE_LIMIT_MAX_REQUESTS;

    const REFRESH_TIME =
      Number(process.env.RATE_LIMIT_REFRESH_TIME) ||
      DEFAULT_RATE_LIMIT_REFRESH_TIME;

    const MAX_REQUESTS_MULTIPLIER =
      Number(process.env.RATE_LIMIT_MAX_REQUESTS_MULTIPLIER) || 1;

    const callerId = request?.user?.id ?? request.ip ?? ANONYMOUS_CALLER;

    const sessionId = `${callerId}-${request.originalUrl}`;

    const record = this.history.get(sessionId);

    if (!record || record.expiration < Date.now()) {
      this.history.set(sessionId, {
        count: 1,
        expiration: Date.now() + REFRESH_TIME,
      });

      return true;
    }

    if (record?.count < MAX_REQUESTS * MAX_REQUESTS_MULTIPLIER) {
      record.count++;
      return true;
    }

    this.logger.warn(`Rate limit exceeded for session ${sessionId}`);

    return false;
  }
}
