import { Module } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { InvestmentsController } from './investments.controller';
import { PdfModule } from '../pdf/pdf.module';
import { ContractModule } from '../contract/contract.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PdfModule, ContractModule, PrismaModule],
  providers: [InvestmentsService],
  controllers: [InvestmentsController],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
