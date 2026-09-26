import {
  CLASSIFICATION_BATCH_SIZE,
  CLASSIFICATION_BATCH_SYSTEM_PROMPT,
  CONFIRMED_SUBSCRIPTION_BATCH_SYSTEM_PROMPT,
} from './constants/vendor-classification.constant';

import Anthropic from '@anthropic-ai/sdk';
import { VendorClassifierService } from './vendor-classifier.service';
import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

const buildClient = (parsedOutput: unknown) => {
  const parse = jest.fn().mockResolvedValue({ parsed_output: parsedOutput });
  const client = { messages: { parse } } as unknown as Anthropic;

  return { client, parse };
};

const buildSequencedClient = (parsedOutputs: unknown[]) => {
  const parse = jest.fn();

  parsedOutputs.forEach((parsedOutput) => {
    parse.mockResolvedValueOnce({ parsed_output: parsedOutput });
  });

  const client = { messages: { parse } } as unknown as Anthropic;

  return { client, parse };
};

const buildRawClassification = (overrides: Record<string, unknown> = {}) => ({
  vendorName: 'Netflix',
  category: TVendorCategory.STREAMING,
  chargeKind: TChargeKind.SUBSCRIPTION,
  billingCycle: TBillingCycle.MONTHLY,
  estimatedAveragePrice: '39.90',
  ...overrides,
});

describe('VendorClassifierService', () => {
  describe('classify', () => {
    it('returns the parsed classification from the AI response', async () => {
      const classification = {
        vendorName: 'Netflix',
        category: TVendorCategory.STREAMING,
        chargeKind: TChargeKind.SUBSCRIPTION,
        billingCycle: TBillingCycle.MONTHLY,
        estimatedAveragePrice: '39.90',
      };
      const { client, parse } = buildClient(classification);
      const service = new VendorClassifierService(client);

      const result = await service.classify('NETFLIX.COM* 1234-5678');

      expect(result).toBe(classification);
      expect(parse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'NETFLIX.COM* 1234-5678' }],
        }),
      );
    });

    it('returns null when the AI response is unparseable', async () => {
      const { client } = buildClient(null);
      const service = new VendorClassifierService(client);

      const result = await service.classify('UNKNOWN MERCHANT 999');

      expect(result).toBeNull();
    });

    it('promotes a ONE_OFF guess to SUBSCRIPTION when the description marks a standing order', async () => {
      const classification = {
        vendorName: 'Space Givatayim',
        category: TVendorCategory.FITNESS,
        chargeKind: TChargeKind.ONE_OFF,
        billingCycle: null,
        estimatedAveragePrice: null,
      };
      const { client } = buildClient(classification);
      const service = new VendorClassifierService(client);

      const result = await service.classify('ספייס גבעתיים-הו"ק');

      expect(result).toEqual({
        ...classification,
        chargeKind: TChargeKind.SUBSCRIPTION,
      });
    });

    it('keeps an essential bill paid by standing order as ESSENTIAL_BILL', async () => {
      const classification = {
        vendorName: 'Israel Electric Company',
        category: TVendorCategory.UTILITIES,
        chargeKind: TChargeKind.ESSENTIAL_BILL,
        billingCycle: null,
        estimatedAveragePrice: null,
      };
      const { client } = buildClient(classification);
      const service = new VendorClassifierService(client);

      const result = await service.classify('חברת החשמל לישראל-הו"ק');

      expect(result).toEqual(classification);
    });
  });

  describe('classifyBatch', () => {
    it('maps each classification back to its input by index, even when the AI reorders them', async () => {
      const { client } = buildClient({
        classifications: [
          { ...buildRawClassification({ vendorName: 'Spotify' }), index: 1 },
          { ...buildRawClassification({ vendorName: 'Netflix' }), index: 0 },
        ],
      });
      const service = new VendorClassifierService(client);

      const result = await service.classifyBatch([
        'NETFLIX.COM* 1234',
        'SPOTIFY AB',
      ]);

      expect(result[0]).toEqual(
        expect.objectContaining({ vendorName: 'Netflix' }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ vendorName: 'Spotify' }),
      );
    });

    it('returns null for an input whose index is missing from the AI response', async () => {
      const { client } = buildClient({
        classifications: [{ ...buildRawClassification(), index: 0 }],
      });
      const service = new VendorClassifierService(client);

      const result = await service.classifyBatch([
        'NETFLIX.COM* 1234',
        'UNKNOWN MERCHANT 999',
      ]);

      expect(result[0]).toEqual(
        expect.objectContaining({ vendorName: 'Netflix' }),
      );
      expect(result[1]).toBeNull();
    });

    it('returns null for every input when the AI response is unparseable', async () => {
      const { client } = buildClient(null);
      const service = new VendorClassifierService(client);

      const result = await service.classifyBatch(['A', 'B', 'C']);

      expect(result).toEqual([null, null, null]);
    });

    it('applies the standing order override per item', async () => {
      const { client } = buildClient({
        classifications: [
          {
            ...buildRawClassification({ chargeKind: TChargeKind.ONE_OFF }),
            index: 0,
          },
        ],
      });
      const service = new VendorClassifierService(client);

      const result = await service.classifyBatch(['ספייס גבעתיים-הו"ק']);

      expect(result[0]).toEqual(
        expect.objectContaining({ chargeKind: TChargeKind.SUBSCRIPTION }),
      );
    });

    it('splits more descriptions than the batch size into separate chunked calls', async () => {
      const descriptions = Array.from(
        { length: CLASSIFICATION_BATCH_SIZE + 1 },
        (_value, index) => `MERCHANT ${index}`,
      );
      const firstChunkOutput = {
        classifications: descriptions
          .slice(0, CLASSIFICATION_BATCH_SIZE)
          .map((_description, index) => ({
            ...buildRawClassification(),
            index,
          })),
      };
      const secondChunkOutput = {
        classifications: [
          { ...buildRawClassification(), index: CLASSIFICATION_BATCH_SIZE },
        ],
      };
      const { client, parse } = buildSequencedClient([
        firstChunkOutput,
        secondChunkOutput,
      ]);
      const service = new VendorClassifierService(client);

      const result = await service.classifyBatch(descriptions);

      expect(parse).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(CLASSIFICATION_BATCH_SIZE + 1);
      expect(result.every((classification) => classification != null)).toBe(
        true,
      );
    });
  });

  describe('classifyConfirmedSubscriptions', () => {
    it('classifies with the confirmed-subscription prompt, while classifyBatch keeps the plain one', async () => {
      const { client, parse } = buildClient({
        classifications: [
          {
            ...buildRawClassification({
              vendorName: 'CrossFit Impulso',
              serviceType: TServiceType.GYM_MEMBERSHIP,
            }),
            index: 0,
          },
        ],
      });
      const service = new VendorClassifierService(client);

      const confirmed = await service.classifyConfirmedSubscriptions([
        'קרוספיט אימפולסו',
      ]);
      await service.classifyBatch(['קרוספיט אימפולסו']);

      expect(confirmed[0]).toEqual(
        expect.objectContaining({ serviceType: TServiceType.GYM_MEMBERSHIP }),
      );
      expect(parse).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          system: CONFIRMED_SUBSCRIPTION_BATCH_SYSTEM_PROMPT,
        }),
      );
      expect(parse).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ system: CLASSIFICATION_BATCH_SYSTEM_PROMPT }),
      );
    });
  });
});
