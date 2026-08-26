import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { METADATA_KEYS } from '@Constants/metadata-keys';
import { extractBearerToken } from '@Utilities/token.utility';
import { ITokenPayload } from '@Modules/auth/interfaces/auth.interface';
import { IAuthenticatedRequest } from '@Interfaces/authenticated-request.interface';

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      METADATA_KEYS.IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (token == null) {
      throw new UnauthorizedException();
    }

    const payload = this.verifyToken(token);

    request.token = token;
    request.user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
    };

    return true;
  }

  private verifyToken(token: string): ITokenPayload {
    try {
      return this.jwtService.verify<ITokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
