import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptPassword, decryptPassword, maskPassword } from '../crypto/encryption.js';

test('AES-256-GCM Encryption & Decryption', () => {
  const secretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const originalPassword = 'super-secret-smtp-password-12345!@#';

  const encrypted = encryptPassword(originalPassword, secretKey);
  assert.notEqual(encrypted, originalPassword);
  assert.equal(encrypted.split(':').length, 3, 'Encrypted output should be in format iv:tag:ciphertext');

  const decrypted = decryptPassword(encrypted, secretKey);
  assert.equal(decrypted, originalPassword);
});

test('Mask Password', () => {
  assert.equal(maskPassword(8), '••••••••');
});
