import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Patch('me/legal-profile')
  @ApiOperation({ summary: 'Mettre à jour le profil personne morale' })
  updateLegalProfile(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.usersService.updateLegalProfile(user.id, body);
  }

  @Get('admin/list')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Liste des investisseurs du tenant' })
  listUsers(@CurrentUser() user: AuthUser) {
    return this.usersService.listByTenant(user.tenantId);
  }

  @Get('admin/:id')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Profil complet d\'un utilisateur' })
  getUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.getByIdForAdmin(user.tenantId, id);
  }

  @Patch('admin/:id/suspend')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Suspendre / réactiver un compte' })
  suspendUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { suspend: boolean }) {
    return this.usersService.suspendUser(user.tenantId, id, body.suspend);
  }

  @Post('admin/:id/reset-password')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Réinitialiser le mot de passe' })
  resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.usersService.resetPassword(user.tenantId, id, body.newPassword);
  }

  @Delete('admin/:id')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Supprimer un compte' })
  deleteUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.deleteUser(user.tenantId, id);
  }

  @Patch('admin/:id/kyc')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: '[Admin] Forcer le statut KYC manuellement' })
  overrideKyc(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: string }) {
    return this.usersService.overrideKyc(user.tenantId, id, body.status);
  }
}
