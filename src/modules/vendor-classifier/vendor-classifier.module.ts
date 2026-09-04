import { Module } from '@nestjs/common';
import { AiModule } from '@Providers/ai/ai.module';
import { VendorClassifierService } from './vendor-classifier.service';

@Module({
  imports: [AiModule],
  exports: [VendorClassifierService],
  providers: [VendorClassifierService],
})
export class VendorClassifierModule {}
