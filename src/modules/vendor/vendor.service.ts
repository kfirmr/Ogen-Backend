import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import {
  IVendorNameEntry,
  IVendorClassificationDefaults,
} from './interfaces/vendor.interface';

import {
  toNameKey,
  mapToCanonicalNames,
} from './utilities/vendor-name.utility';

import { Transaction } from 'sequelize';
import { Vendor } from './entities/vendor.entity';
import { getXDaysAgo } from '@Utilities/date.utility';
import { VendorRepository } from './vendor.repository';
import { TypedLogger } from '../../logger/logger.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { pickMissingFields } from '@Utilities/object.utility';
import { toNewVendor } from './utilities/vendor-record.utility';
import { ICancellationContact } from './interfaces/cancellation-contact.interface';
import { VENDOR_NAME_SIMILARITY_THRESHOLD } from './constants/vendor-matching.constant';
import { CANCELLATION_CONTACT_REFRESH_DAYS } from './constants/cancellation-method.constant';

@Injectable()
export class VendorService {
  private readonly logger = new TypedLogger('VendorService');

  constructor(private readonly vendorRepository: VendorRepository) {}

  public getAll(): Promise<Vendor[]> {
    return this.vendorRepository.getAll();
  }

  public async getById(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findById(id);

    if (vendor == null) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  public async create(data: CreateVendorDto): Promise<Vendor> {
    await this.assertNameIsAvailable(data.name);

    try {
      return await this.vendorRepository.create({
        name: data.name,
        currency: data.currency,
        billingCycle: null,
        category: data.category ?? null,
        serviceType: data.serviceType ?? null,
        chargeKind: null,
        cancellationUrl: null,
        cancellationPhone: null,
        cancellationMethod: null,
        cancellationSourceUrl: null,
        cancellationCheckedAt: null,
        cancellationEmail: data.cancellationEmail ?? null,
        averageMarketPrice: data.averageMarketPrice ?? null,
      });
    } catch (error) {
      this.logger.error({ message: 'Failed to create vendor', error });

      throw error;
    }
  }

  public getByIds(ids: string[]): Promise<Vendor[]> {
    return this.vendorRepository.findByIds(ids);
  }

  // Resolves a whole import's vendor names in a handful of queries: similar names within the
  // batch collapse first, then an exact match wins over a fuzzy one, and only what is still
  // unknown is bulk-created. Keys of the result are the names exactly as given.
  public async findOrCreateManyByName(
    entries: IVendorNameEntry[],
    transaction?: Transaction,
  ): Promise<Map<string, Vendor>> {
    const names = [...new Set(entries.map((entry) => entry.name))];
    const defaultsByName = new Map(
      entries.map((entry) => [entry.name, entry.defaults]),
    );
    const similarPairs = await this.vendorRepository.findSimilarNamePairs(
      names,
      VENDOR_NAME_SIMILARITY_THRESHOLD,
      transaction,
    );
    const canonicalByName = mapToCanonicalNames(names, similarPairs);
    const canonicalNames = [...new Set(canonicalByName.values())];

    const existingByName = await this.findExistingByNames(
      canonicalNames,
      defaultsByName,
      transaction,
    );
    const createdByName = await this.createMissingByNames(
      canonicalNames.filter((name) => !existingByName.has(name)),
      defaultsByName,
      transaction,
    );
    const vendorByCanonicalName = new Map([
      ...existingByName,
      ...createdByName,
    ]);

    return new Map(
      names.flatMap((name) => {
        const vendor =
          vendorByCanonicalName.get(canonicalByName.get(name) ?? name) ?? null;

        return vendor === null ? [] : [[name, vendor] as const];
      }),
    );
  }

  private async findExistingByNames(
    names: string[],
    defaultsByName: Map<string, IVendorClassificationDefaults>,
    transaction?: Transaction,
  ): Promise<Map<string, Vendor>> {
    const exactMatches = await this.vendorRepository.findByLowerNames(
      names,
      transaction,
    );
    const exactByKey = new Map(
      exactMatches.map((vendor) => [toNameKey(vendor.name), vendor]),
    );
    const unmatchedNames = names.filter(
      (name) => !exactByKey.has(toNameKey(name)),
    );
    const similarByName = await this.findSimilarByNames(
      unmatchedNames,
      transaction,
    );

    const matches = names.flatMap((name) => {
      const vendor =
        exactByKey.get(toNameKey(name)) ?? similarByName.get(name) ?? null;

      return vendor === null ? [] : [{ name, vendor }];
    });

    const backfilled = await Promise.all(
      matches.map(async ({ name, vendor }) => {
        const defaults = defaultsByName.get(name) ?? null;
        const resolvedVendor =
          defaults === null
            ? vendor
            : await this.backfillMissingClassification(
                vendor,
                defaults,
                transaction,
              );

        return [name, resolvedVendor] as const;
      }),
    );

    return new Map(backfilled);
  }

  private async findSimilarByNames(
    names: string[],
    transaction?: Transaction,
  ): Promise<Map<string, Vendor>> {
    const matches = await this.vendorRepository.findSimilarToNames(
      names,
      VENDOR_NAME_SIMILARITY_THRESHOLD,
      transaction,
    );
    const vendors = await this.vendorRepository.findByIds(
      matches.map((match) => match.vendorId),
      transaction,
    );
    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

    return new Map(
      matches.flatMap((match) => {
        const vendor = vendorById.get(match.vendorId) ?? null;

        return vendor === null ? [] : [[match.queryName, vendor] as const];
      }),
    );
  }

  // Conflicting names (another import created the vendor meanwhile) are skipped on insert and
  // picked up by the read-back, so concurrent imports converge on one vendor per name.
  private async createMissingByNames(
    names: string[],
    defaultsByName: Map<string, IVendorClassificationDefaults>,
    transaction?: Transaction,
  ): Promise<Map<string, Vendor>> {
    await this.vendorRepository.bulkCreateIgnoringDuplicates(
      names.flatMap((name) => {
        const defaults = defaultsByName.get(name) ?? null;

        return defaults === null ? [] : [toNewVendor(name, defaults)];
      }),
      transaction,
    );

    const vendors = await this.vendorRepository.findByLowerNames(
      names,
      transaction,
    );
    const vendorByKey = new Map(
      vendors.map((vendor) => [toNameKey(vendor.name), vendor]),
    );

    return new Map(
      names.flatMap((name) => {
        const vendor = vendorByKey.get(toNameKey(name)) ?? null;

        return vendor === null ? [] : [[name, vendor] as const];
      }),
    );
  }

  // The classifier is not deterministic, so a field one call left empty may be answered by a
  // later call; only empty fields are filled, never a value that was already resolved.
  private async backfillMissingClassification(
    vendor: Vendor,
    defaults: IVendorClassificationDefaults,
    transaction?: Transaction,
  ): Promise<Vendor> {
    const missingFields = pickMissingFields(vendor, defaults);

    if (Object.keys(missingFields).length === 0) {
      return vendor;
    }

    await this.vendorRepository.update(vendor.id, missingFields, transaction);

    const refreshedVendor = await this.vendorRepository.findById(
      vendor.id,
      transaction,
    );

    return refreshedVendor ?? vendor;
  }

  public async getNeedingCancellationContact(
    vendorIds: string[],
  ): Promise<Vendor[]> {
    return this.vendorRepository.findWithStaleCancellationContact(
      vendorIds,
      getXDaysAgo(CANCELLATION_CONTACT_REFRESH_DAYS),
    );
  }

  public async updateCancellationContact(
    id: string,
    contact: ICancellationContact | null,
  ): Promise<void> {
    await this.vendorRepository.update(id, {
      cancellationCheckedAt: new Date(),
      cancellationUrl: contact?.url ?? null,
      cancellationEmail: contact?.email ?? null,
      cancellationPhone: contact?.phone ?? null,
      cancellationMethod: contact?.method ?? null,
      cancellationSourceUrl: contact?.sourceUrl ?? null,
    });
  }

  public async update(id: string, data: UpdateVendorDto): Promise<Vendor> {
    await this.getById(id);

    if (data.name != null) {
      await this.assertNameIsAvailable(data.name, id);
    }

    await this.vendorRepository.update(id, data);

    return this.getById(id);
  }

  private async assertNameIsAvailable(
    name: string,
    ownerId?: string,
  ): Promise<void> {
    const vendor = await this.vendorRepository.findByName(name);

    if (vendor != null && vendor.id !== ownerId) {
      throw new ConflictException('Vendor name is already taken');
    }
  }
}
