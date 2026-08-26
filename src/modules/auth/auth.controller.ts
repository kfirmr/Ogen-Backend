import { ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { Public } from '@Decorators/public.decorator';
import { Post, Body, Controller } from '@nestjs/common';
import { IAuthResult } from './interfaces/auth.interface';
import { RateLimit } from '@Decorators/rate-limit.decorator';
import { AUTH_ATTEMPT_LIMITS } from './constants/auth.constant';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  @RateLimit(AUTH_ATTEMPT_LIMITS.SIGN_UP)
  public signUp(@Body() data: SignUpDto): Promise<IAuthResult> {
    return this.authService.signUp(data);
  }

  @Public()
  @Post('login')
  @RateLimit(AUTH_ATTEMPT_LIMITS.LOGIN)
  public login(@Body() data: LoginDto): Promise<IAuthResult> {
    return this.authService.login(data);
  }
}
