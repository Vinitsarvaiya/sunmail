import { startSmtpServer } from './server.js';
import { startRetryWorker } from './retry-worker.js';

export * from './config.js';
export * from './parser.js';
export * from './forwarder.js';
export * from './processor.js';

// If run as main process
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  console.log('=====================================================');
  console.log('  🌞 SunMail Mail Server & Forwarding Worker v1.0   ');
  console.log('=====================================================');
  startSmtpServer();
  startRetryWorker();
}
