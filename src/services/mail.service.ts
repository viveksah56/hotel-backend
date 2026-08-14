import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { envConfig } from '../config/env.config.js';
import { ApiError } from '../utils/api.error.js';

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: envConfig.SMTP.HOST,
      port: envConfig.SMTP.PORT,
      secure: envConfig.SMTP.SECURE,
      auth: {
        user: envConfig.SMTP.USERNAME,
        pass: envConfig.SMTP.PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    console.log('SMTP config:', {
      host: envConfig.SMTP.HOST,
      port: envConfig.SMTP.PORT,
      secure: envConfig.SMTP.SECURE,
    });
  }


  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: envConfig.SMTP.FROM_EMAIL,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', { to, subject, error });
      throw new ApiError('Failed to send email', 500);
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
    } catch (error) {
      console.error('Email connection verification failed:', error);
      throw new ApiError('Email connection verification failed', 500);
    }
  }
}

const emailService = new EmailService();
export default emailService;