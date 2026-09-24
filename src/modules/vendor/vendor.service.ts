import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { Vendor } from './entities/vendor.entity';
import { VendorRepository } from './vendor.repository';
import { TypedLogger } from '../../logger/logger.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { TServiceType } from './constants/service-type.constant';
import { TVendorCategory } from './constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';
import { VENDOR_NAME_SIMILARITY_THRESHOLD } from './constants/vendor-matching.constant';

interface IVendorClassificationDefaults {
  isLikelySubscription: boolean;
  category: TVendorCategory | null;
  cancellationEmail: string | null;
  serviceType: TServiceType | null;
  averageMarketPrice: string | null;
  billingCycle: TBillingCycle | null;
}

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
        isLikelySubscription: null,
        cancellationEmail: data.cancellationEmail ?? null,
        averageMarketPrice: data.averageMarketPrice ?? null,
      });
    } catch (error) {
      this.logger.error({ message: 'Failed to create vendor', error });

      throw error;
    }
  }

  public async findOrCreateByName(
    name: string,
    defaults: IVendorClassificationDefaults,
    transaction?: Transaction,
  ): Promise<Vendor> {
    const matchingVendor = await this.findMatchingVendor(name, transaction);

    if (matchingVendor != null) {
      return this.backfillLikelySubscription(
        matchingVendor,
        defaults,
        transaction,
      );
    }

    try {
      return await this.vendorRepository.create(
        {
          name,
          category: defaults.category,
          serviceType: defaults.serviceType,
          billingCycle: defaults.billingCycle,
          cancellationEmail: defaults.cancellationEmail,
          averageMarketPrice: defaults.averageMarketPrice,
          isLikelySubscription: defaults.isLikelySubscription,
        },
        transaction,
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const vendor = await this.vendorRepository.findByName(
          name,
          transaction,
        );

        if (vendor != null) {
          return this.backfillLikelySubscription(vendor, defaults, transaction);
        }
      }

      this.logger.error({ message: 'Failed to find-or-create vendor', error });

      throw error;
    }
  }

  // An exact (case-insensitive) name match wins when available; otherwise fall back to a fuzzy
  // trigram match so an AI-extracted variant of an existing vendor's name (different casing,
  // suffix, or punctuation) reuses that vendor instead of spawning a duplicate.
  private async findMatchingVendor(
    name: string,
    transaction?: Transaction,
  ): Promise<Vendor | null> {
    const exactMatch = await this.vendorRepository.findByName(
      name,
      transaction,
    );

    if (exactMatch != null) {
      return exactMatch;
    }

    return this.vendorRepository.findSimilarByName(
      name,
      VENDOR_NAME_SIMILARITY_THRESHOLD,
      transaction,
    );
  }

  // A vendor's first sighting can leave isLikelySubscription null when the classifier was unsure;
  // a later, resolved classification should still be allowed to fill that gap in.
  private async backfillLikelySubscription(
    vendor: Vendor,
    defaults: IVendorClassificationDefaults,
    transaction?: Transaction,
  ): Promise<Vendor> {
    if (vendor.isLikelySubscription != null) {
      return vendor;
    }

    await this.vendorRepository.update(
      vendor.id,
      { isLikelySubscription: defaults.isLikelySubscription },
      transaction,
    );

    const refreshedVendor = await this.vendorRepository.findById(
      vendor.id,
      transaction,
    );

    return refreshedVendor ?? vendor;
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
