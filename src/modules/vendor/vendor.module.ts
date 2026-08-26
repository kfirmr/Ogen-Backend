import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { VendorRepository } from './vendor.repository';
import { DatabaseModule } from '@Providers/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VendorController],
  exports: [VendorService],
  providers: [VendorService, VendorRepository],
})
export class VendorModule {}
