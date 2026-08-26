import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  exports: [UserService],
  providers: [UserService, UserRepository],
})
export class UserModule {}
