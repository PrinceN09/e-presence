import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

// Inline SVG icons — render in every email client (Gmail, Outlook, Apple Mail, etc.)
const ICON_WARNING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:7px;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#b45309"/></svg>`;

const ICON_PAPERCLIP = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#152535" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:7px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;

const ICON_SHIELD = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#152535" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:7px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

const ICON_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="48" height="48">
  <rect width="80" height="80" rx="10" fill="#152535"/>
  <path d="M 40 10 A 30 30 0 1 0 40 70" fill="none" stroke="#3ABFCF" stroke-width="5" stroke-linecap="round"/>
  <path d="M 40 19 A 21 21 0 1 0 40 61" fill="none" stroke="#3ABFCF" stroke-width="5" stroke-linecap="round"/>
  <path d="M 40 29 A 11 11 0 1 0 40 51" fill="none" stroke="#3ABFCF" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="40" y1="40" x2="70" y2="40" stroke="#3ABFCF" stroke-width="5" stroke-linecap="round"/>
  <circle cx="40" cy="40" r="5.5" fill="#3ABFCF"/>
</svg>`;

const HEADER = `
<div style="background:#152535;padding:20px 28px;display:table;width:100%;box-sizing:border-box;">
  <div style="display:table-cell;vertical-align:middle;">
    <div style="display:inline-block;vertical-align:middle;margin-right:12px;">${LOGO_SVG}</div>
    <div style="display:inline-block;vertical-align:middle;">
      <div style="color:#ffffff;font-weight:700;font-size:18px;font-family:Arial,sans-serif;">e-Présence</div>
      <div style="color:#3ABFCF;font-size:10px;letter-spacing:1.5px;font-family:Arial,sans-serif;">GESTION DES PRÉSENCES</div>
    </div>
  </div>
  <div style="display:table-cell;vertical-align:middle;text-align:right;">
    <div style="color:#3ABFCF;font-size:11px;font-family:Arial,sans-serif;">www.e-presence.org</div>
    <div style="color:#8ab4c4;font-size:11px;margin-top:3px;font-family:Arial,sans-serif;">+243 81 000 0000</div>
  </div>
</div>`;

const FOOTER = `
<div style="background:#f8f8f8;border-top:1px solid #e8e8e8;padding:20px 28px;">
  <p style="font-size:11px;color:#888;margin:0 0 4px;font-family:Arial,sans-serif;">Veuillez ne pas répondre à cet email.</p>
  <p style="font-size:11px;color:#888;margin:0 0 4px;font-family:Arial,sans-serif;">© ${new Date().getFullYear()} e-Présence. Tous droits réservés.</p>
  <p style="font-size:11px;color:#888;margin:0 0 4px;font-family:Arial,sans-serif;">Avenue de la Justice, Gombe, Kinshasa, République Démocratique du Congo</p>
  <p style="font-size:11px;color:#888;margin:0;font-family:Arial,sans-serif;">
    +243 81 000 0000 &middot; <a href="mailto:admin@e-presence.org" style="color:#3ABFCF;">admin@e-presence.org</a>
  </p>
</div>`;

function layout(body: string): string {
  return `<div style="background:#f4f4f4;padding:24px;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
    ${HEADER}
    <div style="padding:32px 28px;">${body}</div>
    ${FOOTER}
  </div>
</div>`;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('SENDGRID_API_KEY');
    this.from = config.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@e-presence.org';

    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.enabled = true;
    } else {
      this.logger.warn('SendGrid API key not set — emails will be logged only');
      this.enabled = false;
    }
  }

  async sendWelcome(to: string, name: string, matricule: string, appUrl: string): Promise<void> {
    const html = layout(`
      <p style="font-size:15px;color:#222;margin:0 0 8px;">Bonjour <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#444;margin:0 0 24px;line-height:1.6;">
        Votre compte e-Présence a été créé. Utilisez les informations ci-dessous pour vous connecter pour la première fois.
      </p>
      <div style="background:#f0f6fb;border:1px solid #cde0ef;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Matricule (identifiant)</div>
          <div style="font-size:26px;font-weight:700;color:#152535;letter-spacing:3px;font-family:monospace;">${matricule}</div>
        </div>
        <div style="border-top:1px solid #cde0ef;padding-top:16px;">
          <div style="font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Mot de passe initial</div>
          <div style="font-size:26px;font-weight:700;color:#152535;letter-spacing:3px;font-family:monospace;">${matricule}</div>
        </div>
      </div>
      <div style="background:#fffbeb;border-left:3px solid #f9a825;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#78350f;display:flex;align-items:flex-start;">
        ${ICON_WARNING}<span>Vous serez invité à changer votre mot de passe à la première connexion.</span>
      </div>
      <a href="${appUrl}" style="display:block;background:#152535;color:#ffffff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:16px;">
        Se connecter →
      </a>
      <p style="font-size:12px;color:#999;text-align:center;margin:0;">
        Lien : <a href="${appUrl}" style="color:#3ABFCF;">${appUrl}</a>
      </p>
    `);

    if (!this.enabled) {
      this.logger.log(`[EMAIL MOCK] Welcome email to: ${to} | Matricule: ${matricule}`);
      return;
    }
    try {
      await sgMail.send({ to, from: this.from, subject: 'e-Présence — Bienvenue, vos identifiants de connexion', html });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Welcome email failed to ${to}: ${err.message}`);
    }
  }

  async sendPasswordReset(to: string, name: string, resetLink: string): Promise<void> {
    const html = layout(`
      <p style="font-size:15px;color:#222;margin:0 0 8px;">Bonjour <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#444;margin:0 0 28px;line-height:1.6;">
        Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer.
      </p>
      <a href="${resetLink}" style="display:block;background:#152535;color:#ffffff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:20px;">
        Réinitialiser mon mot de passe →
      </a>
      <div style="background:#f0f6fb;border:1px solid #cde0ef;border-radius:8px;padding:16px;text-align:center;">
        <p style="font-size:12px;color:#666;margin:0;line-height:1.6;">
          ${ICON_SHIELD}Ce lien expire dans <strong>2 heures</strong>.<br>
          Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
      </div>
    `);

    if (!this.enabled) {
      this.logger.log(`[EMAIL MOCK] Password reset email to: ${to} | Link: ${resetLink}`);
      return;
    }
    try {
      await sgMail.send({ to, from: this.from, subject: 'e-Présence — Réinitialisation de votre mot de passe', html });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Password reset email failed to ${to}: ${err.message}`);
      throw err;
    }
  }

  async sendAttendanceCode(to: string, name: string, code: string): Promise<void> {
    const date = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const html = layout(`
      <p style="font-size:15px;color:#222;margin:0 0 8px;">Bonjour <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#444;margin:0 0 24px;line-height:1.6;">
        ${ICON_CALENDAR}Votre code de présence du <strong>${date}</strong> est :
      </p>
      <div style="background:#f0f6fb;border:1px solid #cde0ef;border-radius:8px;padding:28px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">Code de présence</div>
        <div style="font-size:38px;font-weight:700;color:#152535;letter-spacing:10px;font-family:monospace;">${code}</div>
        <div style="font-size:12px;color:#888;margin-top:10px;">Valable uniquement aujourd'hui</div>
      </div>
      <div style="background:#fffbeb;border-left:3px solid #f9a825;border-radius:0 6px 6px 0;padding:12px 16px;font-size:13px;color:#78350f;display:flex;align-items:flex-start;">
        ${ICON_WARNING}<span><strong>Ne partagez pas ce code.</strong> Il est personnel et ne doit pas être communiqué à d'autres employés.</span>
      </div>
    `);

    if (!this.enabled) {
      this.logger.log(`[EMAIL MOCK] To: ${to} | Code: ${code}`);
      return;
    }
    try {
      await sgMail.send({ to, from: this.from, subject: `e-Présence — Code du jour : ${code}`, html });
      this.logger.log(`Email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Email failed to ${to}: ${err.message}`);
      throw err;
    }
  }

  async sendReportByEmail(
    to: string,
    recipientName: string,
    subject: string,
    filename: string,
    contentType: string,
    fileBuffer: Buffer,
  ): Promise<void> {
    const html = layout(`
      <p style="font-size:15px;color:#222;margin:0 0 8px;">Bonjour <strong>${recipientName}</strong>,</p>
      <p style="font-size:14px;color:#444;margin:0 0 24px;line-height:1.6;">
        Veuillez trouver ci-joint le rapport de présences généré le
        <strong>${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
      </p>
      <div style="background:#f0f6fb;border:1px solid #cde0ef;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;color:#152535;font-weight:700;">${ICON_PAPERCLIP}${filename}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">Rapport joint à cet email</div>
      </div>
      <p style="font-size:13px;color:#888;margin:0;">Cordialement,<br><strong style="color:#152535;">Système e-Présence</strong></p>
    `);

    if (!this.enabled) {
      this.logger.log(`[EMAIL MOCK] Report sent to: ${to} | File: ${filename}`);
      return;
    }
    try {
      await sgMail.send({
        to,
        from: this.from,
        subject,
        html,
        attachments: [
          {
            content: fileBuffer.toString('base64'),
            filename,
            type: contentType,
            disposition: 'attachment',
          },
        ],
      });
      this.logger.log(`Report email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Report email failed to ${to}: ${err.message}`);
      throw err;
    }
  }
}
