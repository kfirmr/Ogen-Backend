import { VendorService } from './vendor.service';
import { Vendor } from './entities/vendor.entity';
import { VendorRepository } from './vendor.repository';
import { TChargeKind } from './constants/charge-kind.constant';
import { TServiceType } from './constants/service-type.constant';
import { TVendorCategory } from './constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

const buildVendor = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'vendor-1',
  name: 'CrossFit Impulso',
  currency: 'ILS',
  category: TVendorCategory.FITNESS,
  serviceType: TServiceType.GYM_MEMBERSHIP,
  billingCycle: null,
  cancellationEmail: null,
  averageMarketPrice: null,
  chargeKind: null,
  ...overrides,
});

const buildVendorEntity = (overrides: Partial<Record<string, unknown>> = {}) =>
  buildVendor(overrides) as unknown as Vendor;

const buildDefaults = (overrides: Partial<Record<string, unknown>> = {}) => ({
  category: TVendorCategory.FITNESS,
  serviceType: TServiceType.GYM_MEMBERSHIP,
  billingCycle: TBillingCycle.MONTHLY,
  averageMarketPrice: null,
  chargeKind: TChargeKind.SUBSCRIPTION,
  ...overrides,
});

const buildRepository = (overrides: Record<string, jest.Mock> = {}) => {
  const repository = {
    findByIds: jest.fn().mockResolvedValue([]),
    findByLowerNames: jest.fn().mockResolvedValue([]),
    findSimilarToNames: jest.fn().mockResolvedValue([]),
    findSimilarNamePairs: jest.fn().mockResolvedValue([]),
    bulkCreateIgnoringDuplicates: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    update: jest.fn().mockResolvedValue([1]),
    ...overrides,
  };

  return {
    repository,
    service: new VendorService(repository as unknown as VendorRepository),
  };
};

describe('VendorService', () => {
  describe('findOrCreateManyByName', () => {
    it('fills every empty classification field on a vendor found by name', async () => {
      const existingVendor = buildVendor();
      const refreshedVendor = buildVendor({
        chargeKind: TChargeKind.SUBSCRIPTION,
        billingCycle: TBillingCycle.MONTHLY,
      });
      const { service, repository } = buildRepository({
        findByLowerNames: jest.fn().mockResolvedValue([existingVendor]),
        findById: jest.fn().mockResolvedValue(refreshedVendor),
      });

      const result = await service.findOrCreateManyByName([
        { name: 'crossfit impulso', defaults: buildDefaults() },
      ]);

      expect(repository.update).toHaveBeenCalledWith(
        'vendor-1',
        {
          billingCycle: TBillingCycle.MONTHLY,
          chargeKind: TChargeKind.SUBSCRIPTION,
        },
        undefined,
      );
      expect(result.get('crossfit impulso')).toBe(refreshedVendor);
      expect(repository.bulkCreateIgnoringDuplicates).toHaveBeenCalledWith(
        [],
        undefined,
      );
    });

    it('does not write when every field is already resolved', async () => {
      const existingVendor = buildVendor({
        chargeKind: TChargeKind.ONE_OFF,
        billingCycle: TBillingCycle.QUARTERLY,
      });
      const { service, repository } = buildRepository({
        findByLowerNames: jest.fn().mockResolvedValue([existingVendor]),
      });

      const result = await service.findOrCreateManyByName([
        { name: 'CrossFit Impulso', defaults: buildDefaults() },
      ]);

      expect(repository.update).not.toHaveBeenCalled();
      expect(result.get('CrossFit Impulso')).toBe(existingVendor);
    });

    it('creates every unknown vendor in one bulk insert and reads them back', async () => {
      const netflix = buildVendor({ id: 'vendor-2', name: 'Netflix' });
      const spotify = buildVendor({ id: 'vendor-3', name: 'Spotify' });
      const { service, repository } = buildRepository({
        findByLowerNames: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([netflix, spotify]),
      });

      const result = await service.findOrCreateManyByName([
        { name: 'Netflix', defaults: buildDefaults() },
        { name: 'Spotify', defaults: buildDefaults() },
      ]);

      expect(repository.bulkCreateIgnoringDuplicates).toHaveBeenCalledTimes(1);
      expect(repository.bulkCreateIgnoringDuplicates).toHaveBeenCalledWith(
        [
          expect.objectContaining({ name: 'Netflix' }),
          expect.objectContaining({ name: 'Spotify' }),
        ],
        undefined,
      );
      expect(result.get('Netflix')).toBe(netflix);
      expect(result.get('Spotify')).toBe(spotify);
    });

    it('reuses a vendor found by fuzzy name match instead of creating a duplicate', async () => {
      const similarVendor = buildVendor({
        name: 'GymCity Ltd',
        chargeKind: TChargeKind.SUBSCRIPTION,
        billingCycle: TBillingCycle.MONTHLY,
      });
      const { service, repository } = buildRepository({
        findByIds: jest.fn().mockResolvedValue([similarVendor]),
        findSimilarToNames: jest
          .fn()
          .mockResolvedValue([
            { queryName: 'Gym City', vendorId: similarVendor.id },
          ]),
      });

      const result = await service.findOrCreateManyByName([
        { name: 'Gym City', defaults: buildDefaults() },
      ]);

      expect(result.get('Gym City')).toBe(similarVendor);
      expect(repository.bulkCreateIgnoringDuplicates).toHaveBeenCalledWith(
        [],
        undefined,
      );
    });

    it('collapses similar new names within one import into a single vendor', async () => {
      const createdVendor = buildVendor({ id: 'vendor-4', name: 'Gym City' });
      const { service, repository } = buildRepository({
        findSimilarNamePairs: jest
          .fn()
          .mockResolvedValue([
            { firstName: 'Gym City', secondName: 'GymCity Ltd' },
          ]),
        findByLowerNames: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([createdVendor]),
      });

      const result = await service.findOrCreateManyByName([
        { name: 'Gym City', defaults: buildDefaults() },
        { name: 'GymCity Ltd', defaults: buildDefaults() },
      ]);

      expect(repository.bulkCreateIgnoringDuplicates).toHaveBeenCalledWith(
        [expect.objectContaining({ name: 'Gym City' })],
        undefined,
      );
      expect(result.get('Gym City')).toBe(createdVendor);
      expect(result.get('GymCity Ltd')).toBe(createdVendor);
    });
  });

  describe('promoteToSubscription', () => {
    it('replaces a generic NONE service type and fills an empty cadence', async () => {
      const { service, repository } = buildRepository();

      await service.promoteToSubscription(
        buildVendorEntity({
          chargeKind: TChargeKind.ONE_OFF,
          serviceType: TServiceType.NONE,
        }),
        {
          billingCycle: TBillingCycle.MONTHLY,
          serviceType: TServiceType.GYM_MEMBERSHIP,
        },
      );

      expect(repository.update).toHaveBeenCalledWith('vendor-1', {
        chargeKind: TChargeKind.SUBSCRIPTION,
        billingCycle: TBillingCycle.MONTHLY,
        serviceType: TServiceType.GYM_MEMBERSHIP,
      });
    });

    it('keeps a service type and cadence the vendor already resolved', async () => {
      const { service, repository } = buildRepository();

      await service.promoteToSubscription(
        buildVendorEntity({
          chargeKind: TChargeKind.ONE_OFF,
          billingCycle: TBillingCycle.YEARLY,
        }),
        {
          billingCycle: TBillingCycle.MONTHLY,
          serviceType: TServiceType.FITNESS_APP,
        },
      );

      expect(repository.update).toHaveBeenCalledWith('vendor-1', {
        chargeKind: TChargeKind.SUBSCRIPTION,
        billingCycle: TBillingCycle.YEARLY,
        serviceType: TServiceType.GYM_MEMBERSHIP,
      });
    });

    it('keeps NONE when the classifier returned no service type', async () => {
      const { service, repository } = buildRepository();

      await service.promoteToSubscription(
        buildVendorEntity({ serviceType: TServiceType.NONE }),
        { billingCycle: TBillingCycle.MONTHLY, serviceType: null },
      );

      expect(repository.update).toHaveBeenCalledWith(
        'vendor-1',
        expect.objectContaining({ serviceType: TServiceType.NONE }),
      );
    });
  });
});
