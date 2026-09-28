import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Try loading from multiple env locations
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  smtpEncryptionKey: process.env.SMTP_ENCRYPTION_KEY || 'default-0123456789abcdef0123456789abcdef',
  mailDomain: process.env.MAIL_DOMAIN || 'sunmail.com',
  mailHost: process.env.MAIL_HOST || 'mail.sunmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '2525', 10),
  smtpListenHost: process.env.SMTP_LISTEN_HOST || '0.0.0.0',
  maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE || '26214400', 10), // 25MB default
};

export function getSupabaseAdmin() {
  validateServiceKey(config.supabaseServiceKey);

  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function validateServiceKey(key: string): 'secret' | 'service_role' {
  if (key.startsWith('sb_secret_')) return 'secret';

  let role: unknown;
  try {
    role = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role;
  } catch {
    // Report the configuration problem without exposing credentials.
  }
  if (role === 'service_role') return 'service_role';

  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY must be a Supabase server secret or service_role key, not a public/anon key. ' +
    'Check the launching terminal environment and .env, then restart the mail worker.'
  );
}

console.log(`[SunMail] Supabase credential type: ${validateServiceKey(config.supabaseServiceKey)}`);
