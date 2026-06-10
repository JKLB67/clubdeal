import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const slug = req.headers['x-tenant-slug'] ?? 'default';

    if (!req.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
      req.tenantId = tenant?.id ?? null;
    }

    return next.handle();
  }
}
