import { Body, Controller, Get, Param, Post, Patch, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { Request } from 'express';

interface AuthUser { id: string; tenantId: string; role: string }

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste des projets actifs du tenant' })
  findAll(@Req() req: Request & { tenantId: string }, @CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId ?? req.tenantId;
    return this.projectsService.findAll(tenantId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un projet" })
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: AuthUser,
  ) {
    const tenantId = user?.tenantId ?? req.tenantId;
    return this.projectsService.findOne(tenantId, id);
  }

  @Post()
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Créer un projet' })
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.projectsService.create(user.tenantId, body);
  }

  @Patch(':id')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Modifier un projet' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projectsService.update(user.tenantId, id, body);
  }
}
