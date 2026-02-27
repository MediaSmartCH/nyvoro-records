import nodemailer from 'nodemailer';
import type { JoinApplicationInput } from '@nyvoro/shared-types';
import {
  buildApplicantAcknowledgementEmail,
  buildApplicationNotificationEmail,
  type ApplicationProfileLinks
} from './application-email-template.js';

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  recipientEmail: string;
  logoUrl: string;
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
    profileLinks: ApplicationProfileLinks;
  }): Promise<void> {
    const { applicationId, payload, profileLinks } = input;
    const internalEmailContent = buildApplicationNotificationEmail({
      applicationId,
      payload,
      profileLinks,
      logoUrl: config.logoUrl
    });
    const applicantEmailContent = buildApplicantAcknowledgementEmail({
      applicationId,
      payload,
      profileLinks,
      logoUrl: config.logoUrl
    });

    await transporter.sendMail({
      from: config.from,
      to: config.recipientEmail,
      replyTo: payload.profile.email,
      subject: internalEmailContent.subject,
      text: internalEmailContent.text,
      html: internalEmailContent.html
    });

    await transporter.sendMail({
      from: config.from,
      to: payload.profile.email,
      replyTo: config.recipientEmail,
      subject: applicantEmailContent.subject,
      text: applicantEmailContent.text,
      html: applicantEmailContent.html
    });
  }

  return {
    sendApplicationNotification
  };
}

export type Mailer = ReturnType<typeof createMailer>;
