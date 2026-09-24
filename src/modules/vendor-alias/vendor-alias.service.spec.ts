import { VendorAliasService } from './vendor-alias.service';
import { VendorAlias } from './entities/vendor-alias.entity';
import { VendorService } from '@Modules/vendor/vendor.service';
import { VendorAliasRepository } from './vendor-alias.repository';

describe('VendorAliasService', () => {
  describe('normalizePattern', () => {
    it('normalizes a raw description the same way alias matching does', () => {
      const service = new VendorAliasService(
        {} as VendorService,
        {} as VendorAliasRepository,
      );

      expect(service.normalizePattern('NETFLIX.COM* 1234-5678')).toBe(
        'netflix com 1234 5678',
      );
    });
  });

  describe('resolveVendorIdsBatch', () => {
    it('dedupes descriptions that normalize to the same pattern into a single lookup', async () => {
      const findManyByPatterns = jest
        .fn()
        .mockResolvedValue([
          { pattern: 'netflix com', vendorId: 'vendor-1' } as VendorAlias,
        ]);
      const vendorAliasRepository = {
        findManyByPatterns,
      } as unknown as VendorAliasRepository;
      const service = new VendorAliasService(
        {} as VendorService,
        vendorAliasRepository,
      );

      const result = await service.resolveVendorIdsBatch([
        'NETFLIX.COM',
        'netflix.com',
        'Spotify AB',
      ]);

      expect(findManyByPatterns).toHaveBeenCalledTimes(1);
      expect(findManyByPatterns).toHaveBeenCalledWith([
        'netflix com',
        'spotify ab',
      ]);
      expect(result.get('netflix com')).toBe('vendor-1');
      expect(result.has('spotify ab')).toBe(false);
    });

    it('returns an empty map when nothing resolves', async () => {
      const vendorAliasRepository = {
        findManyByPatterns: jest.fn().mockResolvedValue([]),
      } as unknown as VendorAliasRepository;
      const service = new VendorAliasService(
        {} as VendorService,
        vendorAliasRepository,
      );

      const result = await service.resolveVendorIdsBatch(['UNKNOWN MERCHANT']);

      expect(result.size).toBe(0);
    });
  });
});
