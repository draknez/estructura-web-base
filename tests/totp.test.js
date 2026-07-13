/**
 * Tests TOTP (RFC 6238) — generados contra el algoritmo de referencia.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSecret,
  totp,
  verifyTotp,
  otpauthUrl,
  generateBackupCodes,
  hashBackupCode,
} from '../server/totp.js';

describe('TOTP secret', () => {
  it('genera secret en base32 sin padding', () => {
    const s = generateSecret();
    assert.match(s, /^[A-Z2-7]+$/);
    assert.ok(s.length >= 26);
  });

  it('dos secrets son distintos', () => {
    assert.notEqual(generateSecret(), generateSecret());
  });
});

describe('TOTP verify', () => {
  it('verifica código recién generado', () => {
    const secret = generateSecret();
    const code = totp(secret);
    assert.equal(verifyTotp(secret, code), true);
  });

  it('rechaza código incorrecto', () => {
    const secret = generateSecret();
    assert.equal(verifyTotp(secret, '000000'), false);
  });

  it('rechaza formato inválido', () => {
    const secret = generateSecret();
    assert.equal(verifyTotp(secret, 'abc'), false);
    assert.equal(verifyTotp(secret, '12345'), false);
    assert.equal(verifyTotp(secret, '1234567'), false);
  });

  it('tolera drift de ±1 ventana (30s)', () => {
    const secret = generateSecret();
    const now = Date.now();
    // Código del periodo anterior
    const pastCode = totp(secret, now - 30 * 1000);
    assert.equal(verifyTotp(secret, pastCode, { window: 1, time: now }), true);
  });
});

describe('otpauthUrl', () => {
  it('genera URL compatible con Google Authenticator', () => {
    const url = otpauthUrl({ issuer: 'BaLog', account: 'admin', secret: 'JBSWY3DPEHPK3PXP' });
    assert.ok(url.startsWith('otpauth://totp/'));
    assert.ok(url.includes('BaLog'));
    assert.ok(url.includes('admin'));
    assert.ok(url.includes('secret=JBSWY3DPEHPK3PXP'));
    assert.ok(url.includes('period=30'));
    assert.ok(url.includes('digits=6'));
  });
});

describe('Backup codes', () => {
  it('genera 10 códigos únicos formato XXXX-XXXX', () => {
    const codes = generateBackupCodes(10);
    assert.equal(codes.length, 10);
    const set = new Set(codes);
    assert.equal(set.size, 10, 'códigos deben ser únicos');
    for (const c of codes) {
      assert.match(c, /^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    }
  });

  it('hashBackupCode es determinista e ignora formato', () => {
    const h1 = hashBackupCode('ABC12-DEF34');
    const h2 = hashBackupCode('abc12-def34');
    const h3 = hashBackupCode('ABC12DEF34');
    assert.equal(h1, h2);
    assert.equal(h1, h3);
    assert.equal(h1.length, 64); // sha256 hex
  });
});