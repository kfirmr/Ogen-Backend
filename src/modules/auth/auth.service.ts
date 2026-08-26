import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UserService } from '@Modules/user/user.service';
import { User } from '@Modules/user/entities/user.entity';
import { AUTH_MESSAGES } from './constants/auth.constant';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IAuthResult, ITokenPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  public async signUp(data: SignUpDto): Promise<IAuthResult> {
    const user = await this.userService.create(data);

    return this.buildAuthResult(user);
  }

  public async login(data: LoginDto): Promise<IAuthResult> {
    const user = await this.userService.verifyCredentials(
      data.email,
      data.password,
    );

    if (user == null) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    return this.buildAuthResult(user);
  }

  private buildAuthResult(user: User): IAuthResult {
    const payload: ITokenPayload = {
      sub: user.id,
      name: user.fullName,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, fullName: user.fullName },
    };
  }
}
