import nodemailer from 'nodemailer';
import type { JoinApplicationInput } from '@nyvoro/shared-types';
import { buildApplicationNotificationEmail } from './application-email-template.js';

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  recipientEmail: string;
};

export function createMailer(config: MailerConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  async function sendApplicationNotification(input: {
    applicationId: string;
    payload: JoinApplicationInput;
  }): Promise<void> {
    const { applicationId, payload } = input;
    const emailContent = buildApplicationNotificationEmail({
      applicationId,
      payload
    });

    await transporter.sendMail({
      from: config.from,
      to: config.recipientEmail,
      replyTo: payload.profile.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });
  }

  return {
    sendApplicationNotification
  };
}

export type Mailer = ReturnType<typeof createMailer>;
