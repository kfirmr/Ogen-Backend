import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { Transaction } from 'sequelize';
import { VendorAlias } from './entities/vendor-alias.entity';
import { VendorService } from '@Modules/vendor/vendor.service';
import { VendorAliasRepository } from './vendor-alias.repository';
import { CreateVendorAliasDto } from './dto/create-vendor-alias.dto';
import { normalizeDescription } from './utilities/description.utility';
import { IVendorAliasSource } from './interfaces/vendor-alias.interface';

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

  // Existing patterns are left untouched, so re-importing a known description is a no-op.
  public async createManyIdempotent(
    aliases: IVendorAliasSource[],
    transaction?: Transaction,
  ): Promise<void> {
    await this.vendorAliasRepository.bulkCreateIgnoringDuplicates(
      aliases.map((alias) => ({
        vendorId: alias.vendorId,
        pattern: normalizeDescription(alias.description),
      })),
      transaction,
    );
  }

  public async delete(id: string): Promise<void> {
    const alias = await this.vendorAliasRepository.findById(id);

    if (alias == null) {
      throw new NotFoundException('Vendor alias not found');
    }

    await this.vendorAliasRepository.delete(id);
  }

  public normalizePattern(description: string): string {
    return normalizeDescription(description);
  }

  public async resolveVendorId(description: string): Promise<string | null> {
    const pattern = normalizeDescription(description);
    const alias = await this.vendorAliasRepository.findByPattern(pattern);

    return alias?.vendorId ?? null;
  }

  public async resolveVendorIdsBatch(
    descriptions: string[],
  ): Promise<Map<string, string>> {
    const patterns = [...new Set(descriptions.map(normalizeDescription))];
    const aliases =
      await this.vendorAliasRepository.findManyByPatterns(patterns);

    return new Map(aliases.map((alias) => [alias.pattern, alias.vendorId]));
  }
}
