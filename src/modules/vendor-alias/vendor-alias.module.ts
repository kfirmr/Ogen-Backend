import { Module } from '@nestjs/common';
import { VendorAliasService } from './vendor-alias.service';
import { VendorModule } from '@Modules/vendor/vendor.module';
import { VendorAliasController } from './vendor-alias.controller';
import { VendorAliasRepository } from './vendor-alias.repository';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule, VendorModule],
  controllers: [VendorAliasController],
  exports: [VendorAliasService],
  providers: [VendorAliasService, VendorAliasRepository],
})
export class VendorAliasModule {}
