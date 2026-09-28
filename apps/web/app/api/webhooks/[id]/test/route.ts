import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dispatchWebhook } from '@sunmail/shared';
import type { Webhook, WebhookPayload } from '@sunmail/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const webhookId = params.id;

  try {
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 });
    }

    const testPayload: WebhookPayload = {
      event: 'email.forwarded',
      emailId: 'test-' + Math.random().toString(36).substring(2, 8),
      domain: 'example.com',
      from: 'sender@example.org',
      to: 'hello@example.com',
      subject: 'SunMail Webhook Test Notification',
      size: 1024,
      status: 'forwarded',
      receivedAt: new Date().toISOString(),
      forwardedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    const result = await dispatchWebhook(webhook.url, webhook.secret, testPayload);

    // Save to deliveries table
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event: testPayload.event,
      payload: testPayload as any,
      status_code: result.statusCode,
      response: result.response || result.error || null,
      attempt_count: 1,
    });

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      response: result.response,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
