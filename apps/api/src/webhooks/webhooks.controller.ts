import { Body, Controller, Post, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('esign')
  @ApiOperation({ summary: 'Webhook e-signature (Yousign / DocuSign)' })
  handleEsign(@Body() payload: Record<string, any>) {
    return this.webhooksService.handleEsign(payload);
  }

  @Post('psp/:provider')
  @ApiOperation({ summary: 'Webhook PSP (mangopay | lemonway)' })
  handlePsp(
    @Param('provider') provider: string,
    @Body() payload: Record<string, any>,
  ) {
    const p = provider.toUpperCase() as 'MANGOPAY' | 'LEMONWAY';
    return this.webhooksService.handlePsp(payload, p);
  }
}
