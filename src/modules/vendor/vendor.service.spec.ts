import { VendorService } from './vendor.service';
import { VendorRepository } from './vendor.repository';
import { TServiceType } from './constants/service-type.constant';
import { TVendorCategory } from './constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';
import { VENDOR_NAME_SIMILARITY_THRESHOLD } from './constants/vendor-matching.constant';

const buildVendor = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'vendor-1',
  name: 'CrossFit Impulso',
  currency: 'ILS',
  category: TVendorCategory.FITNESS,
  serviceType: TServiceType.GYM_MEMBERSHIP,
  billingCycle: null,
  cancellationEmail: null,
  averageMarketPrice: null,
  isLikelySubscription: null,
  ...overrides,
});

const buildDefaults = (overrides: Partial<Record<string, unknown>> = {}) => ({
  category: TVendorCategory.FITNESS,
  serviceType: TServiceType.GYM_MEMBERSHIP,
  billingCycle: TBillingCycle.MONTHLY,
  cancellationEmail: null,
  averageMarketPrice: null,
  isLikelySubscription: true,
  ...overrides,
});

describe('VendorService', () => {
  describe('findOrCreateByName', () => {
    it('backfills a null isLikelySubscription on a vendor found by name', async () => {
      const existingVendor = buildVendor();
      const refreshedVendor = buildVendor({ isLikelySubscription: true });
      const repository = {
        findByName: jest.fn().mockResolvedValue(existingVendor),
        findSimilarByName: jest.fn(),
        findById: jest.fn().mockResolvedValue(refreshedVendor),
        update: jest.fn().mockResolvedValue([1]),
        create: jest.fn(),
      } as unknown as VendorRepository;
      const service = new VendorService(repository);

      const result = await service.findOrCreateByName(
        'CrossFit Impulso',
        buildDefaults(),
      );

      expect(repository.update).toHaveBeenCalledWith(
        'vendor-1',
        { isLikelySubscription: true },
        undefined,
      );
      expect(result).toBe(refreshedVendor);
      expect(repository.findSimilarByName).not.toHaveBeenCalled();
    });

    it('does not overwrite an already-resolved isLikelySubscription', async () => {
      const existingVendor = buildVendor({ isLikelySubscription: false });
      const repository = {
        findByName: jest.fn().mockResolvedValue(existingVendor),
        findSimilarByName: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      } as unknown as VendorRepository;
      const service = new VendorService(repository);

      const result = await service.findOrCreateByName(
        'CrossFit Impulso',
        buildDefaults(),
      );

      expect(repository.update).not.toHaveBeenCalled();
      expect(result).toBe(existingVendor);
    });

    it('creates a new vendor when none exists by that name', async () => {
      const createdVendor = buildVendor({ isLikelySubscription: true });
      const repository = {
        findByName: jest.fn().mockResolvedValue(null),
        findSimilarByName: jest.fn().mockResolvedValue(null),
        findById: jest.fn(),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue(createdVendor),
      } as unknown as VendorRepository;
      const service = new VendorService(repository);

      const result = await service.findOrCreateByName(
        'CrossFit Impulso',
        buildDefaults(),
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'CrossFit Impulso',
          isLikelySubscription: true,
        }),
        undefined,
      );
      expect(result).toBe(createdVendor);
    });

    it('reuses a vendor found by fuzzy name match instead of creating a duplicate', async () => {
      const similarVendor = buildVendor({ name: 'GymCity Ltd' });
      const refreshedVendor = buildVendor({
        name: 'GymCity Ltd',
        isLikelySubscription: true,
      });
      const repository = {
        findByName: jest.fn().mockResolvedValue(null),
        findSimilarByName: jest.fn().mockResolvedValue(similarVendor),
        findById: jest.fn().mockResolvedValue(refreshedVendor),
        update: jest.fn().mockResolvedValue([1]),
        create: jest.fn(),
      } as unknown as VendorRepository;
      const service = new VendorService(repository);

      const result = await service.findOrCreateByName(
        'Gym City',
        buildDefaults(),
      );

      expect(repository.findSimilarByName).toHaveBeenCalledWith(
        'Gym City',
        VENDOR_NAME_SIMILARITY_THRESHOLD,
        undefined,
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(result).toBe(refreshedVendor);
    });
  });
});
