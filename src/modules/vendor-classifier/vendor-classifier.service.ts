import {
  CLASSIFICATION_MODEL,
  CLASSIFICATION_MAX_TOKENS,
  VendorClassificationSchema,
  CLASSIFICATION_SYSTEM_PROMPT,
} from './constants/vendor-classification.constant';

import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable } from '@nestjs/common';
import { TypedLogger } from '../../logger/logger.service';
import { AiProviderNames } from '@Providers/ai/provider-names';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { hasStandingOrderMarker } from './utilities/standing-order.utility';
import { IVendorClassification } from './interfaces/vendor-classification.interface';

@Injectable()
export class VendorClassifierService {
  private readonly logger = new TypedLogger('VendorClassifierService');

  constructor(
    @Inject(AiProviderNames.ANTHROPIC_CLIENT)
    private readonly client: Anthropic,
  ) {}

  public async classify(
    originalDescription: string,
  ): Promise<IVendorClassification | null> {
    const response = await this.client.messages.parse({
      model: CLASSIFICATION_MODEL,
      max_tokens: CLASSIFICATION_MAX_TOKENS,
      system: CLASSIFICATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: originalDescription }],
      output_config: { format: zodOutputFormat(VendorClassificationSchema) },
    });

    if (response.parsed_output == null) {
      this.logger.error({
        message: 'AI returned an unparseable vendor classification',
        error: 'parsed_output was null',
        originalDescription,
      });

      return null;
    }

    if (hasStandingOrderMarker(originalDescription)) {
      return { ...response.parsed_output, isLikelySubscription: true };
    }

    return response.parsed_output;
  }
}
