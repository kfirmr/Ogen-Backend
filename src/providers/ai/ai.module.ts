import { Module } from '@nestjs/common';
import { AnthropicClientProvider } from './anthropic-client.provider';

@Module({
  providers: [AnthropicClientProvider],
  exports: [AnthropicClientProvider],
})
export class AiModule {}
