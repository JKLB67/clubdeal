import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string; role: string }

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mon profil' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.usersService.updatePhysicalProfile(user.id, body);
  }

  @Get('admin/list')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Liste des investisseurs du tenant' })
  listUsers(@CurrentUser() user: AuthUser) {
    return this.usersService.listByTenant(user.tenantId);
  }
}
