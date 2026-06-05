import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilioLib = require('twilio');

@Injectable()
export class SmsService {
  private client: any | null = null;
  private readonly logger = new Logger(SmsService.name);
  private readonly from: string;

  constructor(private config: ConfigService) {
    const accountSid = config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = config.get<string>('TWILIO_AUTH_TOKEN');
    this.from = config.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (accountSid && authToken) {
      const Twilio = twilioLib.Twilio || twilioLib;
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio credentials not set — SMS will be logged only');
    }
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client) {
      this.logger.log(`[SMS MOCK] To: ${to} | Message: ${body}`);
      return;
    }
    try {
      await this.client.messages.create({ to, from: this.from, body });
      this.logger.log(`SMS sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`SMS failed to ${to}: ${err.message}`);
      throw err;
    }
  }
}
