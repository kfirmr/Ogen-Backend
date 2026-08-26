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
        category: data.category ?? null,
        cancellationEmail: data.cancellationEmail ?? null,
        averageMarketPrice: data.averageMarketPrice ?? null,
      });
    } catch (error) {
      this.logger.error({ message: 'Failed to create vendor', error });

      throw error;
    }
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
