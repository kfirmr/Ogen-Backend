import { Module } from '@nestjs/common';
import { XpEventService } from './xp-event.service';
import { UserModule } from '@Modules/user/user.module';
import { LevelModule } from '@Modules/level/level.module';
import { XpEventController } from './xp-event.controller';
import { XpEventRepository } from './xp-event.repository';
import { XpActionModule } from '@Modules/xp-action/xp-action.module';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule, UserModule, LevelModule, XpActionModule],
  controllers: [XpEventController],
  exports: [XpEventService],
  providers: [XpEventService, XpEventRepository],
})
export class XpEventModule {}
