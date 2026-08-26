import {
  ExecutionContext,
  createParamDecorator,
  UnauthorizedException,
} from '@nestjs/common';

import { IAuthenticatedRequest } from '@Interfaces/authenticated-request.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const userId = request.user?.id ?? null;

    if (userId == null) {
      throw new UnauthorizedException();
    }

    return userId;
  },
);
