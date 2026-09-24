import { Module } from '@nestjs/common';
import { DraftActionService } from './draft-action.service';
import { DraftActionController } from './draft-action.controller';
import { DraftActionRepository } from './draft-action.repository';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DraftActionController],
  exports: [DraftActionService],
  providers: [DraftActionService, DraftActionRepository],
})
export class DraftActionModule {}
