import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendOfficerVerificationEmail(to: string, token: string): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      throw new ServiceUnavailableException('Email is not configured. Configure SMTP_HOST, SMTP_USER and SMTP_PASS.');
    }
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') || 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass },
    });
    const baseUrl = (this.config.get<string>('APP_BASE_URL') || 'http://localhost:3000').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/api/officer/verify-email?token=${encodeURIComponent(token)}`;
    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM') || user,
      to,
      subject: 'Verify your DMC Duty Officer email',
      text: `Verify your email using this link: ${verifyUrl}. This link expires in 24 hours.`,
      html: `<p>Verify your DMC Duty Officer email. This link expires in 24 hours.</p><p><a href="${verifyUrl}">Verify email</a></p>`,
    });
  }
}
