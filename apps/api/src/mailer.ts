import nodemailer from 'nodemailer';
import type { JoinApplicationInput } from '@nyvoro/shared-types';

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

    const textBody = [
      `Application ID: ${applicationId}`,
      `Artist Name: ${payload.profile.artistName}`,
      `Legal Name: ${payload.profile.legalName}`,
      `Email: ${payload.profile.email}`,
      `Country: ${payload.profile.country}`,
      `Primary Genre: ${payload.profile.primaryGenre}`,
      `Monthly Listeners: ${payload.audienceAnalytics.monthlyListeners ?? 'n/a'}`,
      `Total Followers: ${payload.audienceAnalytics.totalFollowers ?? 'n/a'}`,
      '',
      'Why Nyvoro:',
      payload.objectives.whyNyvoro,
      '',
      'Roadmap 90 days:',
      payload.planning.roadmap90Days,
      '',
      'Additional Message:',
      payload.message
    ].join('\n');

    await transporter.sendMail({
      from: config.from,
      to: config.recipientEmail,
      replyTo: payload.profile.email,
      subject: `[Nyvoro] New application - ${payload.profile.artistName}`,
      text: textBody
    });
  }

  return {
    sendApplicationNotification
  };
}

export type Mailer = ReturnType<typeof createMailer>;
