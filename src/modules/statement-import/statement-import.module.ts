import { Module } from '@nestjs/common';
import { StatementImportService } from './statement-import.service';
import { DatabaseModule } from '@Providers/database/database.module';
import { StatementImportController } from './statement-import.controller';
import { StatementImportRepository } from './statement-import.repository';
import { TransactionModule } from '@Modules/transaction/transaction.module';

@Module({
  imports: [DatabaseModule, TransactionModule],
  controllers: [StatementImportController],
  exports: [StatementImportService],
  providers: [StatementImportService, StatementImportRepository],
})
export class StatementImportModule {}
