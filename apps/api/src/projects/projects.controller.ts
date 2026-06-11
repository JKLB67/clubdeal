import {
  Body, Controller, Delete, Get, Param, Post, Patch,
  Req, Res, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver');
const execFileAsync = promisify(execFile);
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { Request } from 'express';

interface AuthUser { id: string; tenantId: string; role: string }

const photoStorage = memoryStorage();
const docStorage = memoryStorage();

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Public()
  @Get()
  findAll(@Req() req: Request & { tenantId: string }, @CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId ?? req.tenantId;
    const adminView = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    return this.projectsService.findAll(tenantId, adminView, user?.id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { tenantId: string }, @CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId ?? req.tenantId;
    return this.projectsService.findOne(tenantId, id, user?.id);
  }

  @Post()
  @Roles('ADMIN' as any)
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.projectsService.create(user.tenantId, body);
  }

  @Patch(':id')
  @Roles('ADMIN' as any)
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.projectsService.update(user.tenantId, id, body);
  }

  // ── Photos ──────────────────────────────────────────────────────────────────

  @Post(':id/photos/upload')
  @Roles('ADMIN' as any)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: photoStorage }))
  async uploadPhoto(@Param('id') id: string, @CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Aucun fichier reçu');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
    const dest = join(process.cwd(), 'uploads', 'photos', filename);
    const isHeic = /heic|heif/i.test(file.mimetype) || /\.(heic|heif)$/i.test(file.originalname);
    if (isHeic) {
      const tmp = join(os.tmpdir(), `${Date.now()}.heic`);
      fs.writeFileSync(tmp, file.buffer);
      await execFileAsync('/usr/bin/sips', ['-s', 'format', 'jpeg', tmp, '--out', dest]);
      fs.unlinkSync(tmp);
    } else {
      await sharp(file.buffer).rotate().jpeg({ quality: 85 }).toFile(dest);
    }
    const url = `${process.env.API_URL ?? 'http://localhost:3001'}/uploads/photos/${filename}`;
    return this.projectsService.addPhoto(user.tenantId, id, url);
  }

  @Post(':id/photos/url')
  @Roles('ADMIN' as any)
  addPhotoUrl(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { url: string }) {
    return this.projectsService.addPhoto(user.tenantId, id, body.url);
  }

  @Delete(':id/photos/:photoId')
  @Roles('ADMIN' as any)
  deletePhoto(@Param('id') id: string, @Param('photoId') photoId: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.deletePhoto(user.tenantId, id, photoId);
  }

  @Patch(':id/photos/reorder')
  @Roles('ADMIN' as any)
  reorderPhotos(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { orderedIds: string[] }) {
    return this.projectsService.reorderPhotos(user.tenantId, id, body.orderedIds);
  }

  // ── Documents ───────────────────────────────────────────────────────────────

  @Post(':id/documents/upload')
  @Roles('ADMIN' as any)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: docStorage }))
  async uploadDocument(@Param('id') id: string, @CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Aucun fichier reçu');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const dest = join(process.cwd(), 'uploads', 'documents', filename);
    fs.writeFileSync(dest, file.buffer);
    const url = `${process.env.API_URL ?? 'http://localhost:3001'}/uploads/documents/${filename}`;
    return this.projectsService.addDocument(user.tenantId, id, file.originalname, url);
  }

  @Patch(':id/documents/:docId')
  @Roles('ADMIN' as any)
  updateDocument(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser() user: AuthUser, @Body() body: { label: string }) {
    return this.projectsService.updateDocument(user.tenantId, id, docId, body.label);
  }

  @Delete(':id/documents/:docId')
  @Roles('ADMIN' as any)
  deleteDocument(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.deleteDocument(user.tenantId, id, docId);
  }

  @Patch(':id/documents/reorder')
  @Roles('ADMIN' as any)
  reorderDocuments(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { orderedIds: string[] }) {
    return this.projectsService.reorderDocuments(user.tenantId, id, body.orderedIds);
  }

  // Télécharger un document (utilisateur connecté)
  @Get(':id/documents/:docId/download')
  @ApiOperation({ summary: 'Télécharger un document' })
  async downloadDocument(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const doc = await this.projectsService.getDocumentPath(id, docId);
    // Extraire le nom de fichier depuis l'URL
    const filename = doc.url.split('/').pop()!;
    const filePath = join(process.cwd(), 'uploads', 'documents', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.label ?? doc.name)}"`);
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(filePath).pipe(res as any);
  }

  // Télécharger tous les documents en ZIP
  @Get(':id/documents/download-all')
  @ApiOperation({ summary: 'Télécharger tous les documents en ZIP' })
  async downloadAllDocuments(
    @Param('id') id: string,
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const tenantId = user?.tenantId ?? req.tenantId;
    const project = await this.projectsService.findOne(tenantId, id);
    const docs = (project as any).documents as any[];
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="documents-${id}.zip"`);
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);
    for (const doc of docs) {
      const filename = doc.url.split('/').pop()!;
      const filePath = join(process.cwd(), 'uploads', 'documents', filename);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `${doc.label ?? doc.name}.pdf` });
      }
    }
    await archive.finalize();
  }

  // ── Investisseurs / collecte ─────────────────────────────────────────────────

  @Get(':id/investors')
  @Roles('ADMIN' as any)
  getInvestors(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.getInvestors(user.tenantId, id);
  }

  @Get(':id/pending-payments')
  @Roles('ADMIN' as any)
  getPendingPayments(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.getPendingPayments(user.tenantId, id);
  }

  @Patch(':id/investments/:investmentId/status')
  @Roles('ADMIN' as any)
  setInvestmentStatus(@Param('id') id: string, @Param('investmentId') iid: string, @CurrentUser() user: AuthUser, @Body() body: { status: string }) {
    return this.projectsService.setInvestmentStatus(user.tenantId, id, iid, body.status);
  }

  @Post(':id/investments/:investmentId/confirm-payment')
  @Roles('ADMIN' as any)
  confirmPayment(@Param('id') id: string, @Param('investmentId') iid: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.confirmPayment(user.tenantId, id, iid);
  }

  @Patch(':id/collected')
  @Roles('ADMIN' as any)
  setCollected(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { amountEuros: number }) {
    return this.projectsService.setCollectedAmount(user.tenantId, id, body.amountEuros * 100);
  }

  @Post(':id/sync-balance')
  @Roles('ADMIN' as any)
  syncBalance(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.syncBalanceFromBank(user.tenantId, id);
  }

  // ── Favoris ──────────────────────────────────────────────────────────────────

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Ajouter/retirer des favoris' })
  toggleFavorite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.toggleFavorite(user.id, id);
  }

  // ── Alertes ──────────────────────────────────────────────────────────────────

  @Post(':id/alert')
  @ApiOperation({ summary: 'Activer/désactiver une alerte email' })
  toggleAlert(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { type: 'DOCUMENT_CHANGE' | 'COLLECTION_START' }) {
    return this.projectsService.toggleAlert(user.id, id, body.type);
  }

  // ── Contract config ───────────────────────────────────────────────────────

  @Get(':id/contract-config')
  getContractConfig(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.getContractConfig(user.tenantId, id);
  }

  @Patch(':id/contract-config')
  @Roles('ADMIN' as any)
  upsertContractConfig(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: any) {
    return this.projectsService.upsertContractConfig(user.tenantId, id, body);
  }
}
