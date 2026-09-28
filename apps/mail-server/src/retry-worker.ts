import { getSupabaseAdmin, config } from './config.js';
import { forwardEmail } from './forwarder.js';
import type { EmailMessage, SmtpDestination } from '@sunmail/shared';

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 60 * 1000; // Check every 60s

export async function runRetryCycle() {
  const supabase = getSupabaseAdmin();

  // Find messages in processing status older than 1 minute
  const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: pendingEmails, error } = await supabase
    .from('email_messages')
    .select('*, domain_routes(*, smtp_destinations(*)), delivery_attempts(*)')
    .eq('status', 'processing')
    .lt('received_at', cutoff)
    .limit(20);

  if (error || !pendingEmails || pendingEmails.length === 0) {
    return;
  }

  console.log(`[SunMail Retry Worker] Found ${pendingEmails.length} pending email(s) for retry evaluation.`);

  for (const email of pendingEmails as any[]) {
    const attempts = email.delivery_attempts || [];
    const attemptCount = attempts.length;

    if (attemptCount >= MAX_RETRY_ATTEMPTS) {
      console.warn(`[SunMail Retry Worker] Email ${email.id} exceeded max retries (${MAX_RETRY_ATTEMPTS}). Marking failed.`);
      await supabase
        .from('email_messages')
        .update({
          status: 'failed',
          error_message: `Exceeded maximum retry attempts (${MAX_RETRY_ATTEMPTS})`,
        })
        .eq('id', email.id);
      continue;
    }

    const route = email.domain_routes?.[0];
    const destination = route?.smtp_destinations as SmtpDestination;

    if (!destination) {
      await supabase
        .from('email_messages')
        .update({
          status: 'failed',
          error_message: 'No active SMTP destination route found',
        })
        .eq('id', email.id);
      continue;
    }

    console.log(`[SunMail Retry Worker] Retrying email ${email.id} (attempt #${attemptCount + 1})...`);
    
    // Reconstruct email data
    const emailData = {
      from: email.from_address,
      to: email.to_address,
      envelopeFrom: email.envelope_from,
      envelopeTo: email.envelope_to,
      subject: email.subject || '',
      text: email.text_body || '',
      html: email.html_body || '',
      size: email.size,
      headers: {},
      attachments: [],
    };

    const result = await forwardEmail(destination, emailData);

    // Record attempt
    await supabase.from('delivery_attempts').insert({
      email_id: email.id,
      attempt_number: attemptCount + 1,
      smtp_host: `${destination.host}:${destination.port}`,
      smtp_response_code: result.responseCode || null,
      smtp_response: result.response || result.error || 'Retry attempt completed',
      status: result.status,
    });

    if (result.success) {
      await supabase
        .from('email_messages')
        .update({
          status: 'forwarded',
          forwarded_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', email.id);
      console.log(`[SunMail Retry Worker] Email ${email.id} successfully forwarded on retry.`);
    } else if (result.status === 'permanent_failure') {
      await supabase
        .from('email_messages')
        .update({
          status: 'failed',
          error_message: result.error,
        })
        .eq('id', email.id);
    }
  }
}

export function startRetryWorker() {
  console.log('[SunMail] 🔄 Retry Worker started (cycle interval: 60s)');
  setInterval(() => {
    runRetryCycle().catch((err) => {
      console.error('[SunMail Retry Worker Error]:', err);
    });
  }, RETRY_INTERVAL_MS);
}
