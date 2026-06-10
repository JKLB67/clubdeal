import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvestmentsService } from '../investments/investments.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private investments: InvestmentsService,
  ) {}

  async handleEsign(payload: Record<string, any>) {
    const externalEventId = payload.event_id ?? payload.id ?? `esign_${Date.now()}`;

    // Idempotence : on ignore les doublons
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { externalEventId },
    });
    if (existing) return { skipped: true };

    await this.prisma.webhookEvent.create({
      data: {
        provider: 'YOUSIGN',
        externalEventId,
        eventType: payload.event_type ?? 'SIGNATURE_REQUEST_COMPLETED',
        payload,
        status: 'RECEIVED',
      },
    });

    // Yousign envoie le request_id quand la signature est complète
    const esignRequestId = payload.request_id ?? payload.signature_request_id;
    if (esignRequestId && payload.event_type === 'SIGNATURE_REQUEST_COMPLETED') {
      await this.investments.markSigned(esignRequestId);
      await this.prisma.webhookEvent.update({
        where: { externalEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      this.logger.log(`Signature validée pour request ${esignRequestId}`);
    }

    return { received: true };
  }

  async handlePsp(payload: Record<string, any>, provider: 'MANGOPAY' | 'LEMONWAY') {
    const externalEventId = payload.RessourceId ?? payload.id ?? `psp_${Date.now()}`;

    const existing = await this.prisma.webhookEvent.findUnique({
      where: { externalEventId },
    });
    if (existing) return { skipped: true };

    await this.prisma.webhookEvent.create({
      data: {
        provider,
        externalEventId,
        eventType: payload.EventType ?? payload.event_type ?? 'TRANSFER_RECEIVED',
        payload,
        status: 'RECEIVED',
      },
    });

    // Mangopay : PAYIN_NORMAL_SUCCEEDED = virement reçu
    const isPaymentReceived =
      payload.EventType === 'PAYIN_NORMAL_SUCCEEDED' ||
      payload.event_type === 'TRANSFER_RECEIVED';

    if (isPaymentReceived) {
      const investmentId = payload.Tag ?? payload.metadata?.investment_id;
      const transactionId = payload.RessourceId ?? payload.transaction_id;

      if (investmentId && transactionId) {
        await this.investments.markPaid(transactionId, investmentId);
        await this.prisma.webhookEvent.update({
          where: { externalEventId },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
        this.logger.log(`Paiement confirmé pour investissement ${investmentId}`);
      }
    }

    return { received: true };
  }
}
