/**
 * TOTP (RFC 6238) — implementación pura Node.js sin dependencias externas.
 *
 * Genera y verifica códigos de 6 dígitos basados en HMAC-SHA1 con paso de 30s.
 * Formato del secreto: base32 (mayúsculas, sin padding, A-Z + 2-7).
 *
 * Para apps authenticator (Google Authenticator, Authy, Bitwarden):
 *   otpauth://totp/<issuer>:<account>?secret=<base32>&issuer=<issuer>&period=30&digits=6
 */
import crypto from 'node:crypto';

const PERIOD = 30;
const DIGITS = 6;

// Base32 (RFC 4648)
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(byteLen = 20) {
  const buf = crypto.randomBytes(byteLen);
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += B32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32ToBytes(str) {
  const clean = String(str).toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = '';
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error(`Carácter base32 inválido: ${ch}`);
    bits += idx.toString(2).padStart(5, '0');
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    out.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(out);
}

function hotp(secret, counter, digits = DIGITS) {
  const buf = Buffer.alloc(8);
  // Big-endian 64-bit counter
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = bin % 10 ** digits;
  return code.toString().padStart(digits, '0');
}

export function totp(secret, time = Date.now()) {
  const counter = Math.floor(time / 1000 / PERIOD);
  return hotp(base32ToBytes(secret), counter);
}

function constantTimeEqualStr(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyTotp(secret, code, { window = 1, time = Date.now() } = {}) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(time / 1000 / PERIOD);
  const bytes = base32ToBytes(secret);
  for (let w = -window; w <= window; w++) {
    if (constantTimeEqualStr(hotp(bytes, counter + w), code)) return true;
  }
  return false;
}

export function otpauthUrl({ issuer, account, secret }) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    period: String(PERIOD),
    digits: String(DIGITS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// Backup codes: 10 códigos de 10 chars alfanuméricos, hasheados con SHA-256
export function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(8).toString('hex').slice(0, 10).toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function hashBackupCode(code) {
  const norm = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(norm).digest('hex');
}