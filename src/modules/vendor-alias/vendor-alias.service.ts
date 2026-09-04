import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { VendorAlias } from './entities/vendor-alias.entity';
import { VendorService } from '@Modules/vendor/vendor.service';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { VendorAliasRepository } from './vendor-alias.repository';
import { CreateVendorAliasDto } from './dto/create-vendor-alias.dto';
import { normalizeDescription } from './utilities/description.utility';

@Injectable()
export class VendorAliasService {
  constructor(
    private readonly vendorService: VendorService,
    private readonly vendorAliasRepository: VendorAliasRepository,
  ) {}

  public getByVendor(vendorId: string): Promise<VendorAlias[]> {
    return this.vendorAliasRepository.getByVendor(vendorId);
  }

  public async create(data: CreateVendorAliasDto): Promise<VendorAlias> {
    await this.vendorService.getById(data.vendorId);

    const pattern = normalizeDescription(data.pattern);
    const existingAlias =
      await this.vendorAliasRepository.findByPattern(pattern);

    if (existingAlias != null) {
      throw new ConflictException('Pattern is already mapped to a vendor');
    }

    return this.vendorAliasRepository.create({
      pattern,
      vendorId: data.vendorId,
    });
  }

  public async createIdempotent(
    description: string,
    vendorId: string,
    transaction?: Transaction,
  ): Promise<string> {
    const pattern = normalizeDescription(description);

    try {
      const alias = await this.vendorAliasRepository.create(
        { pattern, vendorId },
        transaction,
      );

      return alias.vendorId;
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const existingAlias = await this.vendorAliasRepository.findByPattern(
          pattern,
          transaction,
        );

        if (existingAlias != null) {
          return existingAlias.vendorId;
        }
      }

      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    const alias = await this.vendorAliasRepository.findById(id);

    if (alias == null) {
      throw new NotFoundException('Vendor alias not found');
    }

    await this.vendorAliasRepository.delete(id);
  }

  public async resolveVendorId(description: string): Promise<string | null> {
    const pattern = normalizeDescription(description);
    const alias = await this.vendorAliasRepository.findByPattern(pattern);

    return alias?.vendorId ?? null;
  }
}
