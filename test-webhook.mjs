import crypto from 'crypto';

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/incoming';
const WEBHOOK_SECRET = 'whsec_9f8b74b7a5446a6a706a706be350d0b2c2aaba3723c3714f';

const payload = {
  event: 'email.received',
  emailId: 'test-email-' + Date.now(),
  domain: 'sunmail.linkpc.net',
  from: 'sender@gmail.com',
  to: 'hello@sunmail.linkpc.net',
  subject: '🧪 Test Webhook from SunMail',
  size: 1234,
  status: 'received',
  receivedAt: new Date().toISOString(),
  timestamp: new Date().toISOString(),
};

const body = JSON.stringify(payload);

// Generate HMAC-SHA256 signature (same as SunMail does)
const signature = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(body)
  .digest('hex');

console.log('📤 Sending test webhook to:', WEBHOOK_URL);
console.log('📦 Payload:', JSON.stringify(payload, null, 2));
console.log('🔏 Signature:', signature);
console.log('');

const res = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-sunmail-signature': signature,
  },
  body,
});

const data = await res.json();

if (res.ok) {
  console.log('✅ Webhook accepted! Status:', res.status);
  console.log('📨 Response:', JSON.stringify(data, null, 2));
} else {
  console.error('❌ Webhook rejected! Status:', res.status);
  console.error('📨 Response:', JSON.stringify(data, null, 2));
}
