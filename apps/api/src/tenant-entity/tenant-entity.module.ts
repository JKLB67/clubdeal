import { Module } from '@nestjs/common';
import { TenantEntityService } from './tenant-entity.service';
import { TenantEntityController } from './tenant-entity.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TenantEntityService],
  controllers: [TenantEntityController],
})
export class TenantEntityModule {}
