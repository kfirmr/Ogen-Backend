import {
  CLASSIFICATION_MODEL,
  CLASSIFICATION_BATCH_SIZE,
  CLASSIFICATION_MAX_TOKENS,
  VendorClassificationSchema,
  CLASSIFICATION_SYSTEM_PROMPT,
  VendorClassificationBatchSchema,
  CLASSIFICATION_BATCH_MAX_TOKENS,
  CLASSIFICATION_BATCH_SYSTEM_PROMPT,
  CONFIRMED_SUBSCRIPTION_BATCH_SYSTEM_PROMPT,
} from './constants/vendor-classification.constant';

import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable } from '@nestjs/common';
import { chunkArray } from '@Utilities/array.utility';
import { TypedLogger } from '../../logger/logger.service';
import { AiProviderNames } from '@Providers/ai/provider-names';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { hasStandingOrderMarker } from './utilities/standing-order.utility';
import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { IVendorClassification } from './interfaces/vendor-classification.interface';

interface IIndexedDescription {
  index: number;
  description: string;
}

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

    return this.applyStandingOrderOverride(
      originalDescription,
      response.parsed_output,
    );
  }

  public classifyBatch(
    descriptions: string[],
  ): Promise<(IVendorClassification | null)[]> {
    return this.classifyInChunks(
      descriptions,
      CLASSIFICATION_BATCH_SYSTEM_PROMPT,
    );
  }

  public classifyConfirmedSubscriptions(
    descriptions: string[],
  ): Promise<(IVendorClassification | null)[]> {
    return this.classifyInChunks(
      descriptions,
      CONFIRMED_SUBSCRIPTION_BATCH_SYSTEM_PROMPT,
    );
  }

  private async classifyInChunks(
    descriptions: string[],
    systemPrompt: string,
  ): Promise<(IVendorClassification | null)[]> {
    const indexedDescriptions = descriptions.map((description, index) => ({
      index,
      description,
    }));
    const chunks = chunkArray(indexedDescriptions, CLASSIFICATION_BATCH_SIZE);
    const chunkResults = await Promise.all(
      chunks.map((chunk) => this.classifyChunk(chunk, systemPrompt)),
    );

    return chunkResults.flat();
  }

  private async classifyChunk(
    chunk: IIndexedDescription[],
    systemPrompt: string,
  ): Promise<(IVendorClassification | null)[]> {
    const response = await this.client.messages.parse({
      model: CLASSIFICATION_MODEL,
      system: systemPrompt,
      max_tokens: CLASSIFICATION_BATCH_MAX_TOKENS,
      messages: [{ role: 'user', content: JSON.stringify(chunk) }],
      output_config: {
        format: zodOutputFormat(VendorClassificationBatchSchema),
      },
    });

    if (response.parsed_output == null) {
      this.logger.error({
        message: 'AI returned an unparseable batch vendor classification',
        error: 'parsed_output was null',
        chunkSize: chunk.length,
      });

      return chunk.map(() => null);
    }

    const classificationByIndex = new Map(
      response.parsed_output.classifications.map((classification) => [
        classification.index,
        classification,
      ]),
    );

    return chunk.map(({ index, description }) => {
      const classification = classificationByIndex.get(index);

      if (classification == null) {
        this.logger.warn({
          message: 'AI batch response omitted a classification for an index',
          index,
        });

        return null;
      }

      return this.applyStandingOrderOverride(description, classification);
    });
  }

  private applyStandingOrderOverride(
    originalDescription: string,
    classification: IVendorClassification,
  ): IVendorClassification {
    const isStandingOrder = hasStandingOrderMarker(originalDescription);
    const isClassifiedOneOff =
      classification.chargeKind === TChargeKind.ONE_OFF;

    // A standing order proves the charge repeats, but an essential bill paid by standing order
    // (electricity, water) must stay an essential bill, so only a ONE_OFF guess is overridden.
    if (isStandingOrder && isClassifiedOneOff) {
      return { ...classification, chargeKind: TChargeKind.SUBSCRIPTION };
    }

    return classification;
  }
}
