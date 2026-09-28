import net from 'node:net';

function sendTestSmtp(options = {}) {
  const host = options.host || '127.0.0.1';
  const port = options.port || 2525;
  const from = options.from || 'sender@example.com';
  const to = options.to || 'hello@sunmail.linkpc.net';
  const subject = options.subject || '🎉 First Inbound SunMail Test Message!';

  console.log(`📬 Connecting to SunMail SMTP receiver at ${host}:${port}...`);

  const socket = net.createConnection(port, host);
  socket.setEncoding('utf8');

  let step = 0;

  const rawEmail = [
    `From: "Test Sender" <${from}>`,
    `To: "SunMail User" <${to}>`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<div style="font-family: sans-serif; padding: 24px; background: #0c0c0e; color: #fff; border-radius: 12px; border: 1px solid #27272a;">`,
    `  <h2 style="color: #f59e0b; margin-top: 0;">🌞 SunMail Relay Success!</h2>`,
    `  <p style="color: #a1a1aa;">This email was received by your local SunMail inbound daemon for domain <strong>${to.split('@')[1]}</strong>.</p>`,
    `  <p style="color: #a1a1aa;">It has been parsed, stored in Supabase, and forwarded to your target SMTP server.</p>`,
    `  <hr style="border: 0; border-top: 1px solid #27272a; margin: 20px 0;" />`,
    `  <p style="font-size: 11px; color: #71717a;">Delivered seamlessly by SunMail SaaS v1.0</p>`,
    `</div>`,
    `.`,
  ].join('\r\n');

  socket.on('data', (data) => {
    const response = data.toString();
    // console.log('SMTP <', response.trim());

    if (step === 0 && response.startsWith('220')) {
      // Send HELO
      socket.write(`EHLO localhost\r\n`);
      step++;
    } else if (step === 1 && response.startsWith('250')) {
      // Send MAIL FROM
      socket.write(`MAIL FROM:<${from}>\r\n`);
      step++;
    } else if (step === 2 && response.startsWith('250')) {
      // Send RCPT TO
      socket.write(`RCPT TO:<${to}>\r\n`);
      step++;
    } else if (step === 3 && response.startsWith('250')) {
      // Send DATA
      socket.write(`DATA\r\n`);
      step++;
    } else if (step === 4 && response.startsWith('354')) {
      // Send email body
      socket.write(`${rawEmail}\r\n`);
      step++;
    } else if (step === 5 && response.startsWith('250')) {
      console.log('✅ Email successfully delivered to SunMail inbound listener!');
      socket.write(`QUIT\r\n`);
      step++;
    } else if (response.startsWith('221')) {
      socket.end();
    }
  });

  socket.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.error(`❌ Connection refused! Make sure "pnpm dev:mail" is running in a terminal first.`);
    } else {
      console.error('❌ SMTP Socket Error:', err.message);
    }
  });

  socket.on('close', () => {
    console.log('🔌 Connection closed.');
  });
}

sendTestSmtp();
