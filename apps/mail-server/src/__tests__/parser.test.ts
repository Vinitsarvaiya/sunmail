import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmailStream } from '../parser.js';

test('MIME Email Stream Parser extracts headers, text, and attachments', async () => {
  const sampleMime = `From: Alice Smith <alice@example.com>
To: Bob Jones <hello@customdomain.com>
Subject: Test Inbound SunMail
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary-123"

--boundary-123
Content-Type: text/plain; charset=utf-8

Hello from Alice! This is a test message.
--boundary-123
Content-Type: text/plain; name="note.txt"
Content-Disposition: attachment; filename="note.txt"

Attachment content text
--boundary-123--
`;

  const parsed = await parseEmailStream(Buffer.from(sampleMime));

  assert.equal(parsed.from, 'alice@example.com');
  assert.equal(parsed.to, 'hello@customdomain.com');
  assert.equal(parsed.subject, 'Test Inbound SunMail');
  assert.ok(parsed.text && parsed.text.includes('Hello from Alice!'));
  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.attachments[0].filename, 'note.txt');
  assert.equal(parsed.attachments[0].content.toString().trim(), 'Attachment content text');
});
