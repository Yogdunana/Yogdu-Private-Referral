import prisma from './prisma';
import { EmailType } from '@prisma/client';
import { getTemplate, TemplateVars } from './email-templates';

interface SendEmailParams {
  to: string;
  type: EmailType;
  vars: TemplateVars;
  userId?: string;
}

async function sendEmail({ to, type, vars, userId }: SendEmailParams): Promise<void> {
  const transporter = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  const template = getTemplate(type);
  const subject = replaceVars(template.subject, vars);
  const html = template.getHtml(vars);

  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport(transporter);

    await transport.sendMail({
      from: `"悠渡脉选" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    await prisma.emailLog.create({
      data: {
        to,
        subject,
        type,
        status: 'success',
        userId,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.emailLog.create({
      data: {
        to,
        subject,
        type,
        status: 'failed',
        error: errorMessage,
        userId,
      },
    });

    console.error(`邮件发送失败 [${type}]: ${errorMessage}`);
  }
}

function replaceVars(template: string, vars: TemplateVars): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return result;
}

export { sendEmail, replaceVars };
export type { SendEmailParams };
