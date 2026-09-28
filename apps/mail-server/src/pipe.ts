#!/usr/bin/env node
import { processInboundEmail } from './processor.js';

/**
 * Postfix Pipe Transport Entrypoint
 * Usage in master.cf:
 * sunmail unix - n n - - pipe
 *   flags=F user=sunmail argv=/usr/bin/node /opt/sunmail/apps/mail-server/dist/pipe.js ${sender} ${recipient}
 */
async function main() {
  const args = process.argv.slice(2);
  const envelopeFrom = args[0] || process.env.SENDER || '';
  const envelopeTo = args[1] || process.env.RECIPIENT || '';

  try {
    const result = await processInboundEmail(process.stdin, {
      envelopeFrom,
      envelopeTo,
    });

    if (!result.success && result.reason?.includes('Domain is not verified')) {
      // Exit with 67 (EX_NOUSER in sysexits.h) or 0 to reject cleanly
      process.exit(0);
    }

    process.exit(0);
  } catch (err) {
    console.error('[SunMail Pipe Error]:', err);
    // Exit with 75 (EX_TEMPFAIL) so Postfix re-queues if temporary system failure
    process.exit(75);
  }
}

main();
