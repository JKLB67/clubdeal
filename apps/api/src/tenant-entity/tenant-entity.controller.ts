import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantEntityService } from './tenant-entity.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string; role: string }

@ApiTags('Tenant Entity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/entity')
export class TenantEntityController {
  constructor(private service: TenantEntityService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.service.get(user.tenantId);
  }

  @Patch()
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.update(user.tenantId, body);
  }
}
