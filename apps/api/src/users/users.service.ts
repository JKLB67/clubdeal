import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        physicalProfile: true,
        legalProfile: { include: { ubos: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async updatePhysicalProfile(userId: string, data: Record<string, unknown>) {
    return this.prisma.userPhysicalProfile.upsert({
      where: { userId },
      create: { userId, ...data } as any,
      update: data as any,
    });
  }

  async listByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        role: true,
        statusKyc: true,
        profileType: true,
        createdAt: true,
        physicalProfile: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  sanitize(user: User) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}
