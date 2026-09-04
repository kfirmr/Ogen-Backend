import Anthropic from '@anthropic-ai/sdk';
import { Provider } from '@nestjs/common';
import { AiProviderNames } from './provider-names';
import { EnvironmentManager } from '../../utilities/environment-manager.utility';

export const AnthropicClientProvider: Provider = {
  provide: AiProviderNames.ANTHROPIC_CLIENT,
  useFactory: () =>
    new Anthropic({
      apiKey: EnvironmentManager.get('ANTHROPIC_API_KEY', {
        errorOnMissing: true,
      }),
    }),
};
