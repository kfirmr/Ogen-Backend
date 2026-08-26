import { Module } from '@nestjs/common';
import { LevelService } from './level.service';
import { LevelController } from './level.controller';
import { LevelRepository } from './level.repository';
import { UserModule } from '@Modules/user/user.module';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [LevelController],
  exports: [LevelService],
  providers: [LevelService, LevelRepository],
})
export class LevelModule {}
