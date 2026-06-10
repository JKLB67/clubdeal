import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';

@Module({
  providers: [ProjectsService, TenantInterceptor],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
