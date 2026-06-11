import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
