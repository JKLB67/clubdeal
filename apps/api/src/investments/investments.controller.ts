import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { InvestmentsService } from './investments.service';
import { ContractService } from '../contract/contract.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

interface AuthUser { id: string; tenantId: string; role: string }

@ApiTags('Investments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(
    private investmentsService: InvestmentsService,
    private contractService: ContractService,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(user.id, user.tenantId, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.investmentsService.findMine(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investmentsService.findOne(user.id, id);
  }

  // ── Legacy PDF contract (kept for backwards compat) ───────────────────────

  @Public()
  @Get(':id/contract')
  async downloadContract(@Param('id') id: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'contracts', `contract-${id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrat-${id}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  }

  // ── Legal HTML documents ──────────────────────────────────────────────────

  @Get(':id/bulletin')
  @ApiOperation({ summary: 'Bulletin de souscription (HTML)' })
  async getBulletin(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.generateBulletin(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id/contrat')
  @ApiOperation({ summary: 'Contrat d\'émission d\'obligations (HTML)' })
  async getContrat(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.generateContrat(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  // ── PDF aplati à la volée (prévisualisation avant signature) ────────────────

  @Get(':id/bulletin/flatten')
  @ApiOperation({ summary: 'Bulletin en HTML sécurisé (prévisualisation, images non copiables)' })
  async flattenBulletin(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.flattenBulletinHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id/contrat/flatten')
  @ApiOperation({ summary: 'Contrat en HTML sécurisé (prévisualisation, images non copiables)' })
  async flattenContrat(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.flattenContratHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  // ── Téléchargement PDF binaire (pour le bouton "Télécharger") ────────────

  @Get(':id/bulletin/download')
  @ApiOperation({ summary: 'Bulletin PDF binaire pour téléchargement' })
  async downloadBulletinPdf(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.contractService.flattenBulletin(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bulletin-${id}.pdf"`);
    res.end(buf);
  }

  @Get(':id/contrat/download')
  @ApiOperation({ summary: 'Contrat PDF binaire pour téléchargement' })
  async downloadContratPdf(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.contractService.flattenContrat(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrat-${id}.pdf"`);
    res.end(buf);
  }

  // ── Viewer HTML sécurisé (prévisualisation, stocké lors de la signature) ──

  @Get(':id/bulletin/pdf')
  @ApiOperation({ summary: 'Bulletin sécurisé (viewer HTML, non copiable)' })
  async getBulletinPdf(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.flattenBulletinHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id/contrat/pdf')
  @ApiOperation({ summary: 'Contrat sécurisé (viewer HTML, non copiable)' })
  async getContratPdf(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.flattenContratHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  // ── Signature actions ─────────────────────────────────────────────────────

  @Post(':id/sign-bulletin')
  @ApiOperation({ summary: 'Investisseur signe le bulletin de souscription' })
  signBulletin(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractService.signBulletin(user.id, id);
  }

  @Post(':id/sign-contrat-investor')
  @ApiOperation({ summary: 'Investisseur signe le contrat d\'émission' })
  signContratInvestor(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractService.signContratInvestor(user.id, id);
  }

  @Post(':id/sign-contrat-emitter')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '[Admin] Co-signe le contrat d\'émission' })
  signContratEmitter(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractService.signContratEmitter(user.tenantId, id);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '[Admin] Refuse la signature avec motif' })
  rejectInvestment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.contractService.rejectInvestment(user.tenantId, id, body.reason);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '[Admin] Supprime un investissement' })
  deleteInvestment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investmentsService.deleteInvestment(user.tenantId, id);
  }

  // ── Legacy sign simulation ────────────────────────────────────────────────

  @Post(':id/sign')
  simulateSign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investmentsService.simulateSign(user.id, id);
  }
}
