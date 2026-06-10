import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new BadRequestException('Tenant introuvable');

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
    });
    if (existing) throw new BadRequestException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        passwordHash,
        profileType: dto.profileType,
        role: 'INVESTOR',
      },
    });

    return this.signToken(user.id, user.email, user.role, user.tenantId);
  }

  async login(dto: LoginDto, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new UnauthorizedException('Tenant introuvable');

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
    });
    if (!user) throw new UnauthorizedException('Identifiants incorrects');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants incorrects');

    return this.signToken(user.id, user.email, user.role, user.tenantId);
  }

  private signToken(id: string, email: string, role: string, tenantId: string) {
    const payload: JwtPayload = { sub: id, email, role, tenantId };
    return {
      access_token: this.jwt.sign(payload),
      user: { id, email, role, tenantId },
    };
  }
}
