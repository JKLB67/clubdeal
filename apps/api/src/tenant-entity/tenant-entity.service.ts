import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantEntityService {
  constructor(private prisma: PrismaService) {}

  async get(tenantId: string) {
    return this.prisma.tenantEntity.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });
  }

  async update(tenantId: string, dto: Partial<{
    name: string;
    legalForm: string;
    capital: number;
    address: string;
    rcsCity: string;
    rcsNumber: string;
    representative: string;
    representativeTitle: string;
    email: string;
    signatureCity: string;
  }>) {
    return this.prisma.tenantEntity.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
  }
}
