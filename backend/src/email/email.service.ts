import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('SENDGRID_API_KEY');
    this.from = config.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@epresence.com';

    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.enabled = true;
    } else {
      this.logger.warn('SendGrid API key not set — emails will be logged only');
      this.enabled = false;
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
    if (!this.enabled) {
      this.logger.log(`[EMAIL MOCK] Report sent to: ${to} | File: ${filename}`);
      return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1E3A5F; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">e-Présence</h1>
          <p style="color: #a8c4e0; margin: 4px 0 0;">Rapport de Présence</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Bonjour <strong>${recipientName}</strong>,</p>
          <p style="color: #555; font-size: 14px;">Veuillez trouver ci-joint le rapport de présences généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">Cordialement,<br><strong>Système e-Présence</strong></p>
        </div>
        <div style="background: #f5f5f5; padding: 16px; text-align: center;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">e-Présence — Ne pas répondre à cet email</p>
        </div>
      </div>
    `;

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

  async sendWelcome(to: string, name: string, matricule: string, appUrl: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1E3A5F; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">e-Présence</h1>
          <p style="color: #a8c4e0; margin: 4px 0 0;">Bienvenue dans le système de présence</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Bonjour <strong>${name}</strong>,</p>
          <p style="color: #555; font-size: 14px;">Votre compte e-Présence a été créé. Voici vos informations de connexion :</p>
          <div style="background: #f0f4f8; border: 2px solid #1E3A5F; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 8px; color: #555; font-size: 13px;">Matricule (identifiant)</p>
            <p style="margin: 0 0 16px; color: #1E3A5F; font-size: 22px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${matricule}</p>
            <p style="margin: 0 0 4px; color: #555; font-size: 13px;">Mot de passe initial</p>
            <p style="margin: 0; color: #1E3A5F; font-size: 22px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${matricule}</p>
          </div>
          <p style="color: #e53e3e; font-size: 13px; text-align: center;">⚠️ Vous serez invité à changer votre mot de passe à la première connexion.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}" style="background: #1E3A5F; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Se connecter →</a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">Lien : ${appUrl}</p>
        </div>
        <div style="background: #f5f5f5; padding: 16px; text-align: center;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">e-Présence — Ne pas répondre à cet email</p>
        </div>
      </div>`;

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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1E3A5F; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">e-Présence</h1>
          <p style="color: #a8c4e0; margin: 4px 0 0;">Réinitialisation du mot de passe</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Bonjour <strong>${name}</strong>,</p>
          <p style="color: #555; font-size: 14px;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="background: #1E3A5F; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold;">Réinitialiser mon mot de passe →</a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">Ce lien expire dans <strong>2 heures</strong>. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        </div>
        <div style="background: #f5f5f5; padding: 16px; text-align: center;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">e-Présence — Ne pas répondre à cet email</p>
        </div>
      </div>`;

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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1E3A5F; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">e-Présence</h1>
          <p style="color: #a8c4e0; margin: 4px 0 0;">Système de Gestion des Présences</p>
        </div>
        <div style="padding: 32px; text-align: center;">
          <p style="color: #333; font-size: 16px;">Bonjour <strong>${name}</strong>,</p>
          <p style="color: #555; font-size: 14px;">Votre code de présence du <strong>${date}</strong> est :</p>
          <div style="background: #f0f4f8; border: 2px dashed #1E3A5F; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #1E3A5F; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px;">Ce code est valable uniquement aujourd'hui.<br>Connectez-vous à l'application et entrez ce code pour signer votre présence.</p>
        </div>
        <div style="background: #f5f5f5; padding: 16px; text-align: center;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">e-Présence — Ne pas répondre à cet email</p>
        </div>
      </div>
    `;

    if (!this.enabled) {
      this.logger.log(`[EMAIL MOCK] To: ${to} | Code: ${code}`);
      return;
    }

    try {
      await sgMail.send({
        to,
        from: this.from,
        subject: `e-Présence — Code du jour : ${code}`,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Email failed to ${to}: ${err.message}`);
      throw err;
    }
  }
}
