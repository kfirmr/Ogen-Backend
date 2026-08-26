import { Module } from '@nestjs/common';
import { XpActionService } from './xp-action.service';
import { XpActionController } from './xp-action.controller';
import { XpActionRepository } from './xp-action.repository';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [XpActionController],
  exports: [XpActionService],
  providers: [XpActionService, XpActionRepository],
})
export class XpActionModule {}
