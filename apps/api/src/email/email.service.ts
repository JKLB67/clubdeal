import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (SMTP_HOST && SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT ?? '587'),
        secure: SMTP_PORT === '465',
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }
  }

  async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@clubdeal.fr',
      to,
      subject,
      html,
    });
  }

  documentAdded(to: string, projectName: string, docLabel: string, projectUrl: string) {
    return this.send(
      to,
      `Nouveau document sur ${projectName}`,
      `<p>Un nouveau document <strong>${docLabel}</strong> a été ajouté au projet <strong>${projectName}</strong>.</p>
       <p><a href="${projectUrl}">Voir le projet</a></p>`,
    );
  }

  collectionStartReminder(to: string, projectName: string, openingDate: Date, projectUrl: string) {
    const fmt = openingDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return this.send(
      to,
      `La collecte "${projectName}" ouvre dans 48h`,
      `<p>La collecte du projet <strong>${projectName}</strong> ouvre le <strong>${fmt}</strong>.</p>
       <p><a href="${projectUrl}">Découvrir le projet →</a></p>`,
    );
  }
}
