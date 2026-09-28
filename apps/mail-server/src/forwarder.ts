import nodemailer from 'nodemailer';
import type { SmtpDestination, ParsedEmailData } from '@sunmail/shared';
import { decryptPassword } from '@sunmail/shared';
import { config } from './config.js';

export interface ForwardResult {
  success: boolean;
  messageId?: string;
  response?: string;
  responseCode?: number;
  status: 'success' | 'temporary_failure' | 'permanent_failure';
  error?: string;
}

/**
 * Creates a Nodemailer transport from a SunMail SmtpDestination config
 */
export function createSmtpTransporter(destination: SmtpDestination, decryptedPassword?: string) {
  const password = decryptedPassword || (destination.encrypted_password 
    ? decryptPassword(destination.encrypted_password, config.smtpEncryptionKey) 
    : '');

  const isSecure = destination.encryption === 'TLS' || destination.port === 465;
  const requireTls = destination.encryption === 'STARTTLS';
  const ignoreTls = destination.encryption === 'None';

  const transportOptions: nodemailer.TransportOptions = {
    host: destination.host,
    port: destination.port,
    secure: isSecure,
    requireTLS: requireTls,
    ignoreTLS: ignoreTls,
    auth: {
      user: destination.username,
      pass: password,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  } as any;

  return nodemailer.createTransport(transportOptions);
}

/**
 * Tests an SMTP connection and verifies login credentials
 */
export async function testSmtpConnection(
  destination: SmtpDestination,
  rawPassword?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createSmtpTransporter(destination, rawPassword);
    await transporter.verify();
    return { success: true, message: 'SMTP connection and authentication successful!' };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to connect to SMTP server',
    };
  }
}

/**
 * Forwards an email to the customer's SMTP server
 */
export async function forwardEmail(
  destination: SmtpDestination,
  emailData: ParsedEmailData
): Promise<ForwardResult> {
  try {
    const transporter = createSmtpTransporter(destination);

    // Sender from_email fallback
    const sender = destination.from_email || emailData.from;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${emailData.from.split('@')[0]} (via SunMail)" <${sender}>`,
      replyTo: emailData.from,
      to: emailData.envelopeTo || emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html || undefined,
      headers: {
        'X-SunMail-Original-From': emailData.from,
        'X-SunMail-Original-To': emailData.to,
        'X-SunMail-Forwarded-By': config.mailHost,
      },
      attachments: emailData.attachments.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        content: att.content,
      })),
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      responseCode: 250,
      status: 'success',
    };
  } catch (err: any) {
    const responseCode = err.responseCode || (err.response ? parseInt(err.response.slice(0, 3), 10) : 500);
    // 4xx SMTP codes or network timeouts are temporary failures (eligible for retry)
    const isTemporary = (responseCode >= 400 && responseCode < 500) || 
      err.code === 'ETIMEDOUT' || 
      err.code === 'ECONNREFUSED' || 
      err.code === 'ESOCKET';

    return {
      success: false,
      response: err.response || err.message,
      responseCode: isNaN(responseCode) ? 500 : responseCode,
      status: isTemporary ? 'temporary_failure' : 'permanent_failure',
      error: err.message || 'SMTP Relay Error',
    };
  }
}
