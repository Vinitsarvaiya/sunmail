import { SMTPServer } from 'smtp-server';
import { processInboundEmail } from './processor.js';
import { config } from './config.js';

export function startSmtpServer() {
  const server = new SMTPServer({
    name: config.mailHost,
    banner: `SunMail Inbound SMTP Gateway (${config.mailHost})`,
    size: config.maxMessageSize,
    authOptional: true,
    disabledCommands: ['AUTH'], // Port 25 receiving server doesn't require auth from external MX
    onConnect(session, callback) {
      console.log(`[SunMail SMTP] Inbound connection from ${session.remoteAddress}`);
      return callback();
    },
    onMailFrom(address, session, callback) {
      return callback(); // Accept all external senders
    },
    onRcptTo(address, session, callback) {
      // Inbound recipient check
      return callback();
    },
    onData(stream, session, callback) {
      const envelopeFrom = session.envelope.mailFrom ? session.envelope.mailFrom.address : '';
      const envelopeTo = session.envelope.rcptTo.length > 0 ? session.envelope.rcptTo[0].address : '';

      processInboundEmail(stream, {
        envelopeFrom,
        envelopeTo,
      })
        .then((result) => {
          if (!result.success) {
            console.warn(`[SunMail SMTP] Inbound mail rejected: ${result.reason}`);
          }
          return callback();
        })
        .catch((err) => {
          console.error('[SunMail SMTP] Error processing message:', err);
          return callback(new Error('Internal Server Error in mail processor'));
        });
    },
  });

  server.on('error', (err) => {
    console.error('[SunMail SMTP Server Error]:', err);
  });

  server.listen(config.smtpPort, config.smtpListenHost, () => {
    console.log(`[SunMail] 🚀 Inbound SMTP Server listening on ${config.smtpListenHost}:${config.smtpPort}`);
    console.log(`[SunMail] Configured Mail Host: ${config.mailHost}`);
  });

  return server;
}

if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  startSmtpServer();
}
