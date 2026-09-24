import Anthropic from '@anthropic-ai/sdk';
import { VendorClassifierService } from './vendor-classifier.service';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';
import { CLASSIFICATION_BATCH_SIZE } from './constants/vendor-classification.constant';

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
  isLikelySubscription: true,
  billingCycle: TBillingCycle.MONTHLY,
  cancellationEmail: null,
  estimatedAveragePrice: '39.90',
  ...overrides,
});

describe('VendorClassifierService', () => {
  describe('classify', () => {
    it('returns the parsed classification from the AI response', async () => {
      const classification = {
        vendorName: 'Netflix',
        category: TVendorCategory.STREAMING,
        isLikelySubscription: true,
        billingCycle: TBillingCycle.MONTHLY,
        cancellationEmail: null,
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

    it('forces isLikelySubscription true when the description marks a standing order', async () => {
      const classification = {
        vendorName: 'Space Givatayim',
        category: TVendorCategory.FITNESS,
        isLikelySubscription: false,
        billingCycle: null,
        cancellationEmail: null,
        estimatedAveragePrice: null,
      };
      const { client } = buildClient(classification);
      const service = new VendorClassifierService(client);

      const result = await service.classify('ספייס גבעתיים-הו"ק');

      expect(result).toEqual({ ...classification, isLikelySubscription: true });
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
            ...buildRawClassification({ isLikelySubscription: false }),
            index: 0,
          },
        ],
      });
      const service = new VendorClassifierService(client);

      const result = await service.classifyBatch(['ספייס גבעתיים-הו"ק']);

      expect(result[0]).toEqual(
        expect.objectContaining({ isLikelySubscription: true }),
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
});
