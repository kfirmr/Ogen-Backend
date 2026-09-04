import Anthropic from '@anthropic-ai/sdk';
import { VendorClassifierService } from './vendor-classifier.service';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

const buildClient = (parsedOutput: unknown) => {
  const parse = jest.fn().mockResolvedValue({ parsed_output: parsedOutput });
  const client = { messages: { parse } } as unknown as Anthropic;

  return { client, parse };
};

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
});
