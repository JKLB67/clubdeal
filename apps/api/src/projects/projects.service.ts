import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  private projectInclude = {
    photos: { orderBy: { orderIndex: 'asc' as const } },
    documents: { orderBy: { orderIndex: 'asc' as const } },
    _count: { select: { investments: true, favorites: true } },
  };

  async findAll(tenantId: string, adminView = false, userId?: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        tenantId,
        ...(adminView ? {} : { status: { in: ['ACTIVE', 'FUNDED'] } }),
      },
      include: {
        ...this.projectInclude,
        ...(userId ? { favorites: { where: { userId }, select: { id: true } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((p: any) => ({
      ...p,
      isFavorite: userId ? (p.favorites?.length ?? 0) > 0 : false,
      favorites: undefined,
    }));
  }

  async findOne(tenantId: string, projectId: string, userId?: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        ...this.projectInclude,
        ...(userId ? { favorites: { where: { userId }, select: { id: true } } } : {}),
        alerts: userId ? { where: { userId }, select: { type: true } } : false,
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const p = project as any;
    return {
      ...p,
      isFavorite: userId ? (p.favorites?.length ?? 0) > 0 : false,
      myAlerts: userId ? (p.alerts ?? []).map((a: any) => a.type) : [],
      favorites: undefined,
      alerts: undefined,
    };
  }

  async create(tenantId: string, data: Record<string, unknown>) {
    return this.prisma.project.create({ data: { tenantId, ...data } as any });
  }

  async update(tenantId: string, projectId: string, data: Record<string, unknown>) {
    await this.findOne(tenantId, projectId);
    const { collectionGoal, annualYield, precommercialisationRate, durationMonths, minInvestment, openingDate, closingDate, ...rest } = data as any;
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...rest,
        ...(collectionGoal !== undefined && { collectionGoal: BigInt(Math.round(Number(collectionGoal))) }),
        ...(annualYield !== undefined && { annualYield: parseFloat(String(annualYield)) }),
        ...(precommercialisationRate !== undefined && { precommercialisationRate: parseFloat(String(precommercialisationRate)) }),
        ...(durationMonths !== undefined && { durationMonths: parseInt(String(durationMonths)) }),
        ...(minInvestment !== undefined && { minInvestment: minInvestment ? BigInt(Math.round(Number(minInvestment) * 100)) : null }),
        ...(openingDate !== undefined && { openingDate: openingDate ? new Date(openingDate) : null }),
        ...(closingDate !== undefined && { closingDate: closingDate ? new Date(closingDate) : null }),
      },
    });
  }

  // ── Photos ──────────────────────────────────────────────────────────────────

  async addPhoto(tenantId: string, projectId: string, url: string) {
    await this.findOne(tenantId, projectId);
    const maxOrder = await this.prisma.projectPhoto.findFirst({
      where: { projectId }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true },
    });
    return this.prisma.projectPhoto.create({
      data: { projectId, url, orderIndex: (maxOrder?.orderIndex ?? -1) + 1 },
    });
  }

  async deletePhoto(tenantId: string, projectId: string, photoId: string) {
    await this.findOne(tenantId, projectId);
    const photo = await this.prisma.projectPhoto.findFirst({ where: { id: photoId, projectId } });
    if (!photo) throw new NotFoundException('Photo introuvable');
    await this.prisma.projectPhoto.delete({ where: { id: photoId } });
    return { deleted: true };
  }

  async reorderPhotos(tenantId: string, projectId: string, orderedIds: string[]) {
    await this.findOne(tenantId, projectId);
    await Promise.all(
      orderedIds.map((id, idx) =>
        this.prisma.projectPhoto.updateMany({ where: { id, projectId }, data: { orderIndex: idx } }),
      ),
    );
    return this.prisma.projectPhoto.findMany({ where: { projectId }, orderBy: { orderIndex: 'asc' } });
  }

  // ── Documents ───────────────────────────────────────────────────────────────

  async addDocument(tenantId: string, projectId: string, name: string, url: string) {
    await this.findOne(tenantId, projectId);
    const maxOrder = await this.prisma.projectDocument.findFirst({
      where: { projectId }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true },
    });
    const doc = await this.prisma.projectDocument.create({
      data: { projectId, name, label: name, url, orderIndex: (maxOrder?.orderIndex ?? -1) + 1 },
    });

    // Notifier les abonnés DOCUMENT_CHANGE
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    const subscribers = await this.prisma.projectAlert.findMany({
      where: { projectId, type: 'DOCUMENT_CHANGE' },
      include: { user: { select: { email: true } } },
    });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    await Promise.all(
      subscribers.map((s: any) =>
        this.email.documentAdded(s.user.email, project!.name, doc.label ?? doc.name, `${appUrl}/projects/${projectId}`),
      ),
    );
    return doc;
  }

  async updateDocument(tenantId: string, projectId: string, docId: string, label: string) {
    await this.findOne(tenantId, projectId);
    return this.prisma.projectDocument.update({ where: { id: docId }, data: { label } });
  }

  async deleteDocument(tenantId: string, projectId: string, docId: string) {
    await this.findOne(tenantId, projectId);
    const doc = await this.prisma.projectDocument.findFirst({ where: { id: docId, projectId } });
    if (!doc) throw new NotFoundException('Document introuvable');
    await this.prisma.projectDocument.delete({ where: { id: docId } });
    return { deleted: true };
  }

  async reorderDocuments(tenantId: string, projectId: string, orderedIds: string[]) {
    await this.findOne(tenantId, projectId);
    await Promise.all(
      orderedIds.map((id, idx) =>
        this.prisma.projectDocument.updateMany({ where: { id, projectId }, data: { orderIndex: idx } }),
      ),
    );
    return this.prisma.projectDocument.findMany({ where: { projectId }, orderBy: { orderIndex: 'asc' } });
  }

  async getDocumentPath(projectId: string, docId: string) {
    const doc = await this.prisma.projectDocument.findFirst({ where: { id: docId, projectId } });
    if (!doc) throw new NotFoundException('Document introuvable');
    return doc;
  }

  // ── Investisseurs ────────────────────────────────────────────────────────────

  async getInvestors(tenantId: string, projectId: string) {
    await this.findOne(tenantId, projectId);
    return this.prisma.investment.findMany({
      where: { projectId, tenantId },
      include: {
        user: { select: { id: true, email: true, physicalProfile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingPayments(tenantId: string, projectId: string) {
    await this.findOne(tenantId, projectId);
    return this.prisma.investment.findMany({
      where: { projectId, tenantId, status: 'PENDING_PAYMENT' },
      include: {
        user: { select: { id: true, email: true, physicalProfile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setInvestmentStatus(tenantId: string, projectId: string, investmentId: string, status: string) {
    await this.findOne(tenantId, projectId);
    const investment = await this.prisma.investment.findFirst({ where: { id: investmentId, projectId, tenantId } });
    if (!investment) throw new NotFoundException('Investissement introuvable');
    const allowed = ['PENDING_SIGNATURE', 'PENDING_PAYMENT', 'CONFIRMED', 'FAILED', 'CANCELLED'];
    if (!allowed.includes(status)) throw new BadRequestException('Statut invalide');

    if (status === 'CONFIRMED' && investment.status !== 'CONFIRMED') {
      const project = await this.findOne(tenantId, projectId);
      await this.prisma.$transaction([
        this.prisma.investment.update({ where: { id: investmentId }, data: { status: status as any, confirmedAt: new Date() } }),
        this.prisma.project.update({ where: { id: projectId }, data: { collectedAmount: (project as any).collectedAmount + investment.amount } }),
      ]);
    } else if (investment.status === 'CONFIRMED' && status !== 'CONFIRMED') {
      const project = await this.findOne(tenantId, projectId);
      const next = (project as any).collectedAmount - investment.amount;
      await this.prisma.$transaction([
        this.prisma.investment.update({ where: { id: investmentId }, data: { status: status as any, confirmedAt: null } }),
        this.prisma.project.update({ where: { id: projectId }, data: { collectedAmount: next < BigInt(0) ? BigInt(0) : next } }),
      ]);
    } else {
      await this.prisma.investment.update({ where: { id: investmentId }, data: { status: status as any } });
    }
    return this.prisma.investment.findUnique({ where: { id: investmentId } });
  }

  async confirmPayment(tenantId: string, projectId: string, investmentId: string) {
    const project = await this.findOne(tenantId, projectId);
    const investment = await this.prisma.investment.findFirst({
      where: { id: investmentId, projectId, tenantId, status: 'PENDING_PAYMENT' },
    });
    if (!investment) throw new NotFoundException('Virement introuvable ou déjà traité');
    const [updated] = await this.prisma.$transaction([
      this.prisma.investment.update({ where: { id: investmentId }, data: { status: 'CONFIRMED', confirmedAt: new Date() } }),
      this.prisma.project.update({ where: { id: projectId }, data: { collectedAmount: (project as any).collectedAmount + investment.amount } }),
    ]);
    return updated;
  }

  async setCollectedAmount(tenantId: string, projectId: string, amountCents: number) {
    await this.findOne(tenantId, projectId);
    return this.prisma.project.update({ where: { id: projectId }, data: { collectedAmount: BigInt(Math.round(amountCents)) } });
  }

  async syncBalanceFromBank(tenantId: string, projectId: string) {
    const project = await this.findOne(tenantId, projectId);
    if (!(project as any).virtualIban) throw new BadRequestException("Aucun IBAN virtuel configuré");
    const sum = await this.prisma.investment.aggregate({ where: { projectId, tenantId, status: 'CONFIRMED' }, _sum: { amount: true } });
    return this.prisma.project.update({ where: { id: projectId }, data: { collectedAmount: sum._sum.amount ?? BigInt(0) } });
  }

  // ── Favoris ─────────────────────────────────────────────────────────────────

  async toggleFavorite(userId: string, projectId: string) {
    const existing = await this.prisma.projectFavorite.findUnique({ where: { userId_projectId: { userId, projectId } } });
    let isFavorite: boolean;
    if (existing) {
      await this.prisma.projectFavorite.delete({ where: { id: existing.id } });
      isFavorite = false;
    } else {
      await this.prisma.projectFavorite.create({ data: { userId, projectId } });
      isFavorite = true;
    }
    const favoritesCount = await this.prisma.projectFavorite.count({ where: { projectId } });
    return { isFavorite, favoritesCount };
  }

  async getDocumentsByProject(projectId: string) {
    return this.prisma.projectDocument.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ── Alertes ─────────────────────────────────────────────────────────────────

  async toggleAlert(userId: string, projectId: string, type: 'DOCUMENT_CHANGE' | 'COLLECTION_START') {
    const existing = await this.prisma.projectAlert.findUnique({
      where: { userId_projectId_type: { userId, projectId, type } },
    });
    if (existing) {
      await this.prisma.projectAlert.delete({ where: { id: existing.id } });
      return { active: false, type };
    }
    await this.prisma.projectAlert.create({ data: { userId, projectId, type } });
    return { active: true, type };
  }

  // ── Contract config ────────────────────────────────────────────────────────

  async getContractConfig(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new Error('Projet introuvable');
    const config = await this.prisma.contractConfig.findUnique({ where: { projectId } });
    if (!config) {
      return {
        projectId,
        priorityRank: 1,
        minGuaranteedRate: 6,
        guaranteedPeriodMonths: 3,
        monthlyComplementaryRate: 2,
        contractualCapRate: 22,
        propertyDescription: null,
        massRepresentative: '',
        competentCourt: 'Strasbourg',
        earlyRepaymentNoticeDays: 7,
        latePaymentPenaltyPoints: 5,
      };
    }
    return {
      ...config,
      minGuaranteedRate: Number(config.minGuaranteedRate),
      monthlyComplementaryRate: Number(config.monthlyComplementaryRate),
      contractualCapRate: Number(config.contractualCapRate),
    };
  }

  async upsertContractConfig(tenantId: string, projectId: string, dto: any) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new Error('Projet introuvable');
    const data = {
      priorityRank: dto.priorityRank ? Number(dto.priorityRank) : undefined,
      minGuaranteedRate: dto.minGuaranteedRate !== undefined ? Number(dto.minGuaranteedRate) : undefined,
      guaranteedPeriodMonths: dto.guaranteedPeriodMonths ? Number(dto.guaranteedPeriodMonths) : undefined,
      monthlyComplementaryRate: dto.monthlyComplementaryRate !== undefined ? Number(dto.monthlyComplementaryRate) : undefined,
      contractualCapRate: dto.contractualCapRate !== undefined ? Number(dto.contractualCapRate) : undefined,
      propertyDescription: dto.propertyDescription ?? undefined,
      massRepresentative: dto.massRepresentative ?? undefined,
      competentCourt: dto.competentCourt ?? undefined,
      earlyRepaymentNoticeDays: dto.earlyRepaymentNoticeDays ? Number(dto.earlyRepaymentNoticeDays) : undefined,
      latePaymentPenaltyPoints: dto.latePaymentPenaltyPoints ? Number(dto.latePaymentPenaltyPoints) : undefined,
    };
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return this.prisma.contractConfig.upsert({
      where: { projectId },
      create: { projectId, ...clean },
      update: clean,
    });
  }

  // Appelé par un cron job (toutes les heures) — envoie les alertes 48h avant ouverture
  async sendOpeningReminders() {
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const in47h = new Date(Date.now() + 47 * 60 * 60 * 1000);
    const projects = await this.prisma.project.findMany({
      where: { openingDate: { gte: in47h, lte: in48h } },
      include: { alerts: { where: { type: 'COLLECTION_START' }, include: { user: { select: { email: true } } } } },
    });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    for (const project of projects) {
      for (const alert of (project as any).alerts) {
        await this.email.collectionStartReminder(alert.user.email, project.name, project.openingDate!, `${appUrl}/projects/${project.id}`);
      }
    }
  }
}
