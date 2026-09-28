import { simpleParser, ParsedMail } from 'mailparser';
import type { Readable } from 'node:stream';
import type { ParsedEmailData } from '@sunmail/shared';

/**
 * Parses raw MIME email stream or buffer
 */
export async function parseEmailStream(
  streamOrBuffer: Readable | Buffer,
  envelopeFrom?: string,
  envelopeTo?: string
): Promise<ParsedEmailData> {
  const parsed: ParsedMail = await simpleParser(streamOrBuffer);

  // Extract from address
  let fromAddress = envelopeFrom || '';
  if (parsed.from?.value && parsed.from.value.length > 0) {
    fromAddress = parsed.from.value[0].address || fromAddress;
  }

  // Extract to address
  let toAddress = envelopeTo || '';
  if (parsed.to) {
    if (Array.isArray(parsed.to)) {
      toAddress = parsed.to[0]?.value[0]?.address || toAddress;
    } else if (parsed.to.value && parsed.to.value.length > 0) {
      toAddress = parsed.to.value[0].address || toAddress;
    }
  }

  // Process attachments
  const attachments = (parsed.attachments || []).map((att) => ({
    filename: att.filename || `attachment-${Date.now()}`,
    contentType: att.contentType || 'application/octet-stream',
    content: att.content,
    size: att.size || att.content.length,
  }));

  // Headers map
  const headersObj: Record<string, string | string[] | undefined> = {};
  if (parsed.headers) {
    for (const [key, value] of parsed.headers.entries()) {
      if (typeof value === 'object' && value !== null && 'text' in value) {
        headersObj[key] = (value as any).text;
      } else {
        headersObj[key] = value as string | string[];
      }
    }
  }

  return {
    messageId: parsed.messageId || `<${Date.now()}@sunmail.internal>`,
    envelopeFrom: envelopeFrom || fromAddress,
    envelopeTo: envelopeTo || toAddress,
    from: fromAddress,
    to: toAddress,
    subject: parsed.subject || '(No Subject)',
    text: parsed.text || '',
    html: typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml || ''),
    size: Buffer.isBuffer(streamOrBuffer) ? streamOrBuffer.length : 0,
    headers: headersObj,
    attachments,
  };
}
