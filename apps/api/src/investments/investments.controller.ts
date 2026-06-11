import { Body, Controller, Get, Param, Post, Res, UseGuards, InternalServerErrorException } from '@nestjs/common';
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createCanvas } = require('@napi-rs/canvas') as typeof import('@napi-rs/canvas');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFDocument } = require('pdf-lib') as typeof import('pdf-lib');

/**
 * Rend un HTML en PDF via Puppeteer, puis aplatit chaque page en image PNG
 * pour produire un PDF incopiable.
 */
async function htmlToPdfFlattened(html: string): Promise<Buffer> {
  // Import dynamique pour éviter les problèmes de module
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    await browser.close();

    // Aplatir : rendre chaque page en image PNG via pdfjs + canvas
    const pdfjsLib = await (Function('return import("pdfjs-dist/legacy/build/pdf.mjs")')() as Promise<any>);
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), disableWorker: true });
    const pdfDoc = await loadingTask.promise;
    const outDoc = await PDFDocument.create();

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const pdfPage = await pdfDoc.getPage(i);
      const viewport = pdfPage.getViewport({ scale: 2.0 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pdfPage.render({ canvasContext: ctx as any, viewport }).promise;
      const png = canvas.toBuffer('image/png');
      const img = await outDoc.embedPng(png);
      const outPage = outDoc.addPage([viewport.width, viewport.height]);
      outPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    }

    return Buffer.from(await outDoc.save());
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

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

  // ── Flatten HTML contract → image-based PDF (non copiable) ──────────────────

  @Get(':id/bulletin/flatten')
  @ApiOperation({ summary: 'Bulletin aplati non copiable (PDF images)' })
  async flattenBulletin(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.generateBulletin(id);
    const pdfBytes = await htmlToPdfFlattened(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bulletin-confidentiel.pdf"`);
    res.end(pdfBytes);
  }

  @Get(':id/contrat/flatten')
  @ApiOperation({ summary: 'Contrat aplati non copiable (PDF images)' })
  async flattenContrat(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractService.generateContrat(id);
    const pdfBytes = await htmlToPdfFlattened(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrat-confidentiel.pdf"`);
    res.end(pdfBytes);
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

  // ── Legacy sign simulation ────────────────────────────────────────────────

  @Post(':id/sign')
  simulateSign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investmentsService.simulateSign(user.id, id);
  }
}
