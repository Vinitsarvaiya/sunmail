import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Normalizes a 32-byte key from string or env
 */
function getKeyBuffer(secretKey?: string): Buffer {
  const rawKey = secretKey || process.env.SMTP_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('Encryption key not provided. Set SMTP_ENCRYPTION_KEY in environment.');
  }

  // If hex string (64 chars = 32 bytes)
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  // If UTF-8 string, hash to guarantee 32 bytes
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns formatted string: "iv_hex:tag_hex:ciphertext_hex"
 */
export function encryptPassword(plainText: string, secretKey?: string): string {
  if (!plainText) return '';
  const key = getKeyBuffer(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string formatted as "iv_hex:tag_hex:ciphertext_hex"
 */
export function decryptPassword(encryptedValue: string, secretKey?: string): string {
  if (!encryptedValue) return '';
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getKeyBuffer(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks password for safe frontend transmission
 */
export function maskPassword(length = 8): string {
  return '•'.repeat(length);
}
