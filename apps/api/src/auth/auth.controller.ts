import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: "Inscription d'un investisseur" })
  register(
    @Body() dto: RegisterDto,
    @Headers('x-tenant-slug') tenantSlug: string,
  ) {
    return this.authService.register(dto, tenantSlug ?? 'default');
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Connexion' })
  login(
    @Body() dto: LoginDto,
    @Headers('x-tenant-slug') tenantSlug: string,
  ) {
    return this.authService.login(dto, tenantSlug ?? 'default');
  }
}
