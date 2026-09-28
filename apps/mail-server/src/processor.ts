import { getSupabaseAdmin, config } from './config.js';
import { parseEmailStream } from './parser.js';
import { forwardEmail } from './forwarder.js';
import { dispatchWebhook } from '@sunmail/shared';
import type { Readable } from 'node:stream';
import type { Domain, SmtpDestination, Webhook, WebhookPayload } from '@sunmail/shared';

export interface ProcessMailOptions {
  envelopeFrom?: string;
  envelopeTo?: string;
}

/**
 * Main Inbound Email Processing Engine
 */
export async function processInboundEmail(
  rawStreamOrBuffer: Readable | Buffer,
  options: ProcessMailOptions = {}
) {
  const supabase = getSupabaseAdmin();
  console.log(`[SunMail Processor] Processing new inbound email from ${options.envelopeFrom} to ${options.envelopeTo}...`);

  // 1. Parse MIME message
  const emailData = await parseEmailStream(rawStreamOrBuffer, options.envelopeFrom, options.envelopeTo);
  const recipient = (emailData.envelopeTo || emailData.to || '').toLowerCase().trim();
  const recipientDomain = recipient.includes('@') ? recipient.split('@')[1] : '';

  if (!recipientDomain) {
    console.error(`[SunMail Processor] Invalid recipient address: ${recipient}`);
    return { success: false, reason: 'Invalid recipient address' };
  }

  // 2. Anti-Abuse & Domain Verification Check
  const { data: domainRecord, error: domainError } = await supabase
    .from('domains')
    .select('*')
    .eq('domain', recipientDomain)
    .single();

  if (domainError || !domainRecord) {
    console.warn(`[SunMail Processor] [Anti-Abuse] Rejected email for unknown/unregistered domain: ${recipientDomain}`);
    return { success: false, reason: `Domain ${recipientDomain} is not registered in SunMail` };
  }

  const domain = domainRecord as Domain;

  if (domain.status !== 'verified') {
    console.warn(`[SunMail Processor] [Anti-Abuse] Rejected email for unverified domain: ${recipientDomain} (status: ${domain.status})`);
    
    // Log as rejected in email_messages
    await supabase.from('email_messages').insert({
      domain_id: domain.id,
      message_id: emailData.messageId,
      envelope_from: emailData.envelopeFrom,
      envelope_to: emailData.envelopeTo,
      from_address: emailData.from,
      to_address: emailData.to,
      subject: emailData.subject,
      text_body: emailData.text,
      html_body: emailData.html,
      size: emailData.size,
      status: 'rejected',
      error_message: 'Domain DNS verification is pending or domain is disabled',
    });

    return { success: false, reason: 'Domain is not verified' };
  }

  // 3. Create email_messages record in Supabase
  const { data: emailRecord, error: emailInsertError } = await supabase
    .from('email_messages')
    .insert({
      domain_id: domain.id,
      message_id: emailData.messageId,
      envelope_from: emailData.envelopeFrom,
      envelope_to: emailData.envelopeTo,
      from_address: emailData.from,
      to_address: emailData.to,
      subject: emailData.subject,
      text_body: emailData.text,
      html_body: emailData.html,
      size: emailData.size,
      status: 'processing',
    })
    .select('*')
    .single();

  if (emailInsertError || !emailRecord) {
    console.error('[SunMail Processor] Failed to insert email message record:', emailInsertError);
    return { success: false, reason: 'Database insert failed' };
  }

  const emailId = emailRecord.id;

  // 4. Upload attachments to Supabase Storage if any
  if (emailData.attachments && emailData.attachments.length > 0) {
    for (const att of emailData.attachments) {
      try {
        const storagePath = `${domain.id}/${emailId}/${Date.now()}-${att.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        
        const { error: uploadError } = await supabase.storage
          .from('email-attachments')
          .upload(storagePath, att.content, {
            contentType: att.contentType,
            upsert: true,
          });

        if (!uploadError) {
          await supabase.from('email_attachments').insert({
            email_id: emailId,
            filename: att.filename,
            content_type: att.contentType,
            size: att.size,
            storage_path: storagePath,
          });
        } else {
          console.warn('[SunMail Processor] Storage upload warning:', uploadError);
        }
      } catch (attErr) {
        console.error('[SunMail Processor] Error uploading attachment:', attErr);
      }
    }
  }

  // Dispatch email.received webhook
  await triggerUserWebhooks(domain.user_id, {
    event: 'email.received',
    emailId,
    domain: domain.domain,
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    size: emailData.size,
    status: 'received',
    receivedAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  });

  // 5. Look up domain routes and SMTP destination
  const { data: routeData } = await supabase
    .from('domain_routes')
    .select('*, smtp_destinations(*)')
    .eq('domain_id', domain.id)
    .eq('enabled', true)
    .single();

  if (!routeData || !routeData.smtp_destinations) {
    const errorMsg = 'No active SMTP destination route configured for this domain';
    console.warn(`[SunMail Processor] ${errorMsg} (${domain.domain})`);

    await supabase
      .from('email_messages')
      .update({
        status: 'failed',
        error_message: errorMsg,
      })
      .eq('id', emailId);

    await triggerUserWebhooks(domain.user_id, {
      event: 'email.failed',
      emailId,
      domain: domain.domain,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      size: emailData.size,
      status: 'failed',
      receivedAt: new Date().toISOString(),
      errorMessage: errorMsg,
      timestamp: new Date().toISOString(),
    });

    return { success: false, reason: errorMsg };
  }

  const destination = routeData.smtp_destinations as SmtpDestination;

  // 6. Forward Email to Customer SMTP
  console.log(`[SunMail Processor] Forwarding email ${emailId} to ${destination.host}:${destination.port}...`);
  const forwardResult = await forwardEmail(destination, emailData);

  // 7. Log delivery attempt
  await supabase.from('delivery_attempts').insert({
    email_id: emailId,
    attempt_number: 1,
    smtp_host: `${destination.host}:${destination.port}`,
    smtp_response_code: forwardResult.responseCode || null,
    smtp_response: forwardResult.response || forwardResult.error || 'Forwarding completed',
    status: forwardResult.status,
  });

  // 8. Update Email Status
  const isSuccess = forwardResult.success;
  const finalStatus = isSuccess ? 'forwarded' : (forwardResult.status === 'temporary_failure' ? 'processing' : 'failed');
  const forwardedAt = isSuccess ? new Date().toISOString() : null;

  await supabase
    .from('email_messages')
    .update({
      status: finalStatus,
      forwarded_at: forwardedAt,
      error_message: forwardResult.error || null,
    })
    .eq('id', emailId);

  // 9. Dispatch final webhook
  await triggerUserWebhooks(domain.user_id, {
    event: isSuccess ? 'email.forwarded' : 'email.failed',
    emailId,
    domain: domain.domain,
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    size: emailData.size,
    status: finalStatus,
    receivedAt: new Date().toISOString(),
    forwardedAt,
    errorMessage: forwardResult.error,
    timestamp: new Date().toISOString(),
  });

  console.log(`[SunMail Processor] Email ${emailId} completed with status: ${finalStatus}`);
  return { success: isSuccess, emailId, status: finalStatus, forwardResult };
}

/**
 * Triggers configured webhooks for a user
 */
async function triggerUserWebhooks(userId: string, payload: WebhookPayload) {
  const supabase = getSupabaseAdmin();
  try {
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (!webhooks || webhooks.length === 0) return;

    for (const wh of webhooks as Webhook[]) {
      if (wh.events && wh.events.includes(payload.event)) {
        const dispatchResult = await dispatchWebhook(wh.url, wh.secret, payload);
        
        await supabase.from('webhook_deliveries').insert({
          webhook_id: wh.id,
          event: payload.event,
          payload: payload as any,
          status_code: dispatchResult.statusCode,
          response: dispatchResult.response || dispatchResult.error || null,
          attempt_count: 1,
        });
      }
    }
  } catch (err) {
    console.error('[SunMail Processor] Webhook dispatch error:', err);
  }
}
