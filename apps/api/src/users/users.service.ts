import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  async updateLegalProfile(userId: string, data: Record<string, unknown>) {
    return this.prisma.userLegalProfile.upsert({
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
        isSuspended: true,
        createdAt: true,
        physicalProfile: { select: { firstName: true, lastName: true } },
        legalProfile: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByIdForAdmin(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        physicalProfile: true,
        legalProfile: { include: { ubos: true } },
        investments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const { passwordHash: _, ...safe } = user;
    return {
      ...safe,
      investments: safe.investments.map((i) => ({ ...i, amount: i.amount.toString() })),
    };
  }

  async suspendUser(tenantId: string, userId: string, suspend: boolean) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.prisma.user.update({ where: { id: userId }, data: { isSuspended: suspend } });
  }

  async deleteUser(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async resetPassword(tenantId: string, userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) throw new BadRequestException('Mot de passe trop court (8 caractères min)');
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  }

  sanitize(user: User) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}
