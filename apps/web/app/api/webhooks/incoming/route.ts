import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/webhooks/incoming
 *
 * Receives SunMail webhook events for inbound emails.
 * Verifies the HMAC-SHA256 signature before processing.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // ── Signature Verification ──────────────────────────────────────────────
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const signature = req.headers.get('x-sunmail-signature');

    if (webhookSecret && signature) {
      const expected =
        'sha256=' +
        crypto
          .createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

      if (signature !== expected) {
        console.warn('[Webhook] Invalid signature — request rejected');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // ── Parse Payload ────────────────────────────────────────────────────────
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      event,
      emailId,
      domain,
      from,
      to,
      subject,
      status,
      size,
      receivedAt,
      forwardedAt,
      errorMessage,
    } = payload as {
      event: string;
      emailId?: string;
      domain?: string;
      from?: string;
      to?: string;
      subject?: string;
      status?: string;
      size?: number;
      receivedAt?: string;
      forwardedAt?: string;
      errorMessage?: string;
    };

    console.log(`[Webhook] Received event: ${event}`);

    // ── Handle Events ────────────────────────────────────────────────────────
    switch (event) {
      case 'email.received': {
        console.log(`[Webhook] 📨 New email received on ${domain}`);
        console.log(`  From   : ${from}`);
        console.log(`  To     : ${to}`);
        console.log(`  Subject: ${subject}`);
        console.log(`  Size   : ${size} bytes`);
        console.log(`  Time   : ${receivedAt}`);
        break;
      }

      case 'email.forwarded': {
        console.log(`[Webhook] ✅ Email ${emailId} forwarded successfully`);
        console.log(`  Forwarded at: ${forwardedAt}`);
        break;
      }

      case 'email.failed': {
        console.error(`[Webhook] ❌ Email ${emailId} failed`);
        console.error(`  Reason: ${errorMessage}`);
        break;
      }

      case 'email.rejected': {
        console.warn(`[Webhook] 🚫 Email rejected for domain: ${domain}`);
        break;
      }

      default:
        console.log(`[Webhook] Unknown event: ${event} — ignoring`);
    }

    // Always respond 200 quickly so SunMail doesn't retry
    return NextResponse.json({ received: true, event }, { status: 200 });
  } catch (err) {
    console.error('[Webhook] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
