import crypto from 'node:crypto';
import type { WebhookPayload } from '../types/index.js';

export interface WebhookDispatchResult {
  statusCode: number | null;
  response: string | null;
  success: boolean;
  error?: string;
}

/**
 * Computes HMAC SHA-256 signature for SunMail webhooks
 */
export function signWebhookPayload(payloadString: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString, 'utf8')
    .digest('hex');
}

/**
 * Dispatches an event payload to a destination webhook URL
 */
export async function dispatchWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload,
  timeoutMs = 10000
): Promise<WebhookDispatchResult> {
  const payloadString = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadString, secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SunMail-Webhook-Dispatcher/1.0',
        'X-SunMail-Signature': signature,
        'X-SunMail-Timestamp': timestamp,
        'X-SunMail-Event': payload.event,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await res.text();
    const truncatedResponse = responseText.slice(0, 1000); // store max 1k chars

    return {
      statusCode: res.status,
      response: truncatedResponse,
      success: res.ok,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      statusCode: null,
      response: null,
      success: false,
      error: err.name === 'AbortError' ? 'Webhook delivery timed out' : (err.message || 'Unknown network error'),
    };
  }
}
