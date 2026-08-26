import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '@Decorators/current-user.decorator';
import { Get, Put, Body, Delete, Controller } from '@nestjs/common';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  public getCurrentUser(@CurrentUser() userId: string): Promise<User> {
    return this.userService.getById(userId);
  }

  @Put('me')
  public update(
    @CurrentUser() userId: string,
    @Body() data: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(userId, data);
  }

  @Delete('me')
  public delete(@CurrentUser() userId: string): Promise<void> {
    return this.userService.delete(userId);
  }
}
