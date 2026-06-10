import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvestmentsService {
  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
  ) {}

  async create(userId: string, tenantId: string, dto: CreateInvestmentDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId, status: 'ACTIVE' },
    });
    if (!project) throw new NotFoundException('Projet introuvable ou clôturé');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { physicalProfile: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.statusKyc !== 'VALIDATED') {
      throw new BadRequestException('KYC non validé — souscription impossible');
    }

    const existing = await this.prisma.investment.findFirst({
      where: {
        userId,
        projectId: dto.projectId,
        status: { in: ['PENDING_SIGNATURE', 'PENDING_PAYMENT'] },
      },
    });
    if (existing) throw new BadRequestException('Une souscription est déjà en cours pour ce projet');

    const investment = await this.prisma.investment.create({
      data: {
        tenantId,
        userId,
        projectId: dto.projectId,
        amount: BigInt(dto.amount * 100),
        status: 'PENDING_SIGNATURE',
      },
    });

    // Génération du contrat PDF
    const profile = user.physicalProfile;
    const contractPdf = await this.pdf.generateContract({
      investorFirstName: profile?.firstName ?? 'Investisseur',
      investorLastName:  profile?.lastName ?? '',
      investorEmail:     user.email,
      projectName:       project.name,
      projectAddress:    project.address,
      amount:            dto.amount,
      annualYield:       project.annualYield.toString(),
      durationMonths:    project.durationMonths,
      investmentId:      investment.id,
      date:              new Date().toLocaleDateString('fr-FR'),
    });

    // Stockage local du PDF (en prod : S3)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `contract-${investment.id}.pdf`;
    fs.writeFileSync(path.join(uploadsDir, filename), contractPdf);
    const contractUrl = `/uploads/contracts/${filename}`;

    // En prod : appel API Yousign/DocuSign ici
    // Pour le MVP, on simule un esign_request_id
    const esignRequestId = `esign_mock_${investment.id}`;

    const updated = await this.prisma.investment.update({
      where: { id: investment.id },
      data: { esignRequestId },
    });

    return {
      ...updated,
      contractUrl,
      amount: updated.amount.toString(),
    };
  }

  async findMine(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            name: true,
            address: true,
            annualYield: true,
            durationMonths: true,
            virtualIban: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return investments.map((inv) => ({
      ...inv,
      amount: inv.amount.toString(),
    }));
  }

  async findOne(userId: string, investmentId: string) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: investmentId, userId },
      include: {
        project: true,
      },
    });
    if (!inv) throw new NotFoundException('Investissement introuvable');
    return { ...inv, amount: inv.amount.toString() };
  }

  // Appelé par le webhook e-sign quand la signature est complète
  async markSigned(esignRequestId: string) {
    const inv = await this.prisma.investment.findFirst({
      where: { esignRequestId },
    });
    if (!inv) throw new NotFoundException('Investissement introuvable');

    return this.prisma.investment.update({
      where: { id: inv.id },
      data: {
        status: 'PENDING_PAYMENT',
        esignSignedAt: new Date(),
      },
    });
  }

  // Appelé par le webhook PSP quand le virement est reçu
  async markPaid(pspTransactionId: string, investmentId: string) {
    const inv = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: { project: true },
    });
    if (!inv) throw new NotFoundException('Investissement introuvable');

    const [updatedInv] = await this.prisma.$transaction([
      this.prisma.investment.update({
        where: { id: investmentId },
        data: {
          status: 'CONFIRMED',
          pspTransactionId,
          confirmedAt: new Date(),
        },
      }),
      this.prisma.project.update({
        where: { id: inv.projectId },
        data: { collectedAmount: { increment: inv.amount } },
      }),
    ]);

    return updatedInv;
  }

  // Pour le MVP : simulation de signature sans vrai prestataire
  async simulateSign(userId: string, investmentId: string) {
    const inv = await this.prisma.investment.findFirst({
      where: { id: investmentId, userId, status: 'PENDING_SIGNATURE' },
    });
    if (!inv) throw new BadRequestException('Souscription non trouvée ou déjà signée');

    return this.prisma.investment.update({
      where: { id: inv.id },
      data: { status: 'PENDING_PAYMENT', esignSignedAt: new Date() },
    });
  }
}
