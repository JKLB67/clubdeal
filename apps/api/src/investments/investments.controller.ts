import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string }

@ApiTags('Investments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Initier une souscription (génère le contrat PDF)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(user.id, user.tenantId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mes investissements' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.investmentsService.findMine(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un investissement' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investmentsService.findOne(user.id, id);
  }

  @Get(':id/contract')
  @ApiOperation({ summary: 'Télécharger le contrat PDF' })
  async downloadContract(@Param('id') id: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'contracts', `contract-${id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrat-${id}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: '[MVP] Simuler la signature électronique' })
  simulateSign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investmentsService.simulateSign(user.id, id);
  }
}
