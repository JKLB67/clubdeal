import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'FUNDED'] } },
      include: {
        photos: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { investments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        photos: { orderBy: { orderIndex: 'asc' } },
        documents: true,
        _count: { select: { investments: true } },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  async create(tenantId: string, data: Record<string, unknown>) {
    return this.prisma.project.create({
      data: { tenantId, ...data } as any,
    });
  }

  async update(tenantId: string, projectId: string, data: Record<string, unknown>) {
    await this.findOne(tenantId, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: data as any,
    });
  }
}
