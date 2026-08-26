import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { TokenGuard } from '@Guards/token.guard';
import { AuthController } from './auth.controller';
import { UserModule } from '@Modules/user/user.module';
import { DEFAULT_TOKEN_EXPIRY_SECONDS } from './constants/auth.constant';
import { EnvironmentManager } from '@Utilities/environment-manager.utility';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: EnvironmentManager.get('JWT_SECRET', { errorOnMissing: true }),
        signOptions: {
          expiresIn: Number(
            EnvironmentManager.get('JWT_EXPIRES_IN_SECONDS', {
              defaultValue: String(DEFAULT_TOKEN_EXPIRY_SECONDS),
            }),
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
  providers: [AuthService, { provide: APP_GUARD, useClass: TokenGuard }],
})
export class AuthModule {}
