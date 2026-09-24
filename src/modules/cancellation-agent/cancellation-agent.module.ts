import { Module } from '@nestjs/common';
import { CancellationAgentService } from './cancellation-agent.service';

@Module({
  exports: [CancellationAgentService],
  providers: [CancellationAgentService],
})
export class CancellationAgentModule {}
