/**
 * HTTP integration tests — levantan el server en proceso (sin red real).
 * Usa fetch nativo de Node 18+ para evitar dependencias.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Setup env ANTES de importar server
const TMP_DB = path.join(
  import.meta.dirname,
  '.tmp',
  `db-${process.pid}-${Date.now()}.sqlite`
);
fs.mkdirSync(path.dirname(TMP_DB), { recursive: true });
process.env.DB_PATH = TMP_DB;
process.env.PORT = String(30000 + Math.floor(Math.random() * 30000));
process.env.HOST = '127.0.0.1';
process.env.ALLOW_PUBLIC_REGISTER = 'true';
process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-chars-XYZ';
// Desactivar rate limiting efectivo: keys por proceso de test.
// (Los middlewares usan process.env si está definido.)
process.env.TEST_DISABLE_RATE_LIMIT = '1';

// 2. Importar server (no auto-arranca porque no es main)
const serverMod = await import('../server/index.js');
const { startServer } = serverMod;

let baseUrl;
let activeServer;

before(async () => {
  activeServer = startServer();
  await new Promise((resolve, reject) => {
    activeServer.once('listening', resolve);
    activeServer.once('error', reject);
    setTimeout(() => reject(new Error('server start timeout')), 5000);
  });
  baseUrl = `http://127.0.0.1:${process.env.PORT}`;
});

after(async () => {
  if (activeServer) {
    await new Promise((resolve) => activeServer.close(resolve));
  }
  try { fs.unlinkSync(TMP_DB); } catch {}
  try { fs.rmdirSync(path.dirname(TMP_DB)); } catch {}
});

// Helper: cliente HTTP con cookie jar en memoria
function makeClient() {
  let cookie = '';
  async function call(method, p, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;
    const res = await fetch(`${baseUrl}${p}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const m = setCookie.match(/balog_token=([^;]+)/);
      if (m) cookie = `balog_token=${m[1]}`;
    }
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
  }
  return {
    get:  (p)    => call('GET', p),
    post: (p, b) => call('POST', p, b),
    put:  (p, b) => call('PUT', p, b),
    del:  (p)    => call('DELETE', p),
    cookie: () => cookie,
  };
}

// ===========================
// Suites
// ===========================

describe('HTTP /health & /ready', () => {
  it('/health responde ok', async () => {
    const r = await fetch(`${baseUrl}/health`).then((x) => x.json());
    assert.equal(r.status, 'ok');
    assert.equal(r.db, 'ok');
  });

  it('/ready responde true', async () => {
    const r = await fetch(`${baseUrl}/ready`).then((x) => x.json());
    assert.equal(r.ready, true);
  });

  it('/api/users/status responde con array', async () => {
    const r = await fetch(`${baseUrl}/api/users/status`).then((x) => x.json());
    assert.ok(Array.isArray(r));
  });
});

describe('HTTP auth básico', () => {
  let saClient;

  before(async () => {
    saClient = makeClient();
    const r = await saClient.post('/api/register', { username: 'sa_int', password: 'StrongP4ss!' });
    assert.equal(r.status, 200);
  });

  it('Genesis register → Sa', async () => {
    const r = await saClient.get('/api/me');
    assert.equal(r.status, 200);
    assert.ok(r.body.user.roles.includes('Sa'));
  });

  it('login con password correcta', async () => {
    const c = makeClient();
    const r = await c.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    assert.equal(r.status, 200);
  });

  it('/api/me con cookie devuelve usuario', async () => {
    const c = makeClient();
    await c.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    const r = await c.get('/api/me');
    assert.equal(r.status, 200);
    assert.equal(r.body.user.username, 'sa_int');
  });

  it('login con password incorrecta → 401', async () => {
    const c = makeClient();
    const r = await c.post('/api/login', { username: 'sa_int', password: 'WRONG' });
    assert.equal(r.status, 401);
  });

  it('registro con password débil → 400', async () => {
    const c = makeClient();
    const r = await c.post('/api/register', { username: 'weak_user', password: 'short' });
    assert.equal(r.status, 400);
  });

  it('GET /api/admin/users sin cookie → 401', async () => {
    const r = await fetch(`${baseUrl}/api/admin/users`);
    assert.equal(r.status, 401);
  });
});

describe('HTTP admin gating & no-leak', () => {
  let saClient;

  before(async () => {
    saClient = makeClient();
    await saClient.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
  });

  it('GET /api/admin/users como Sa NO expone password ni hashes', async () => {
    const r = await saClient.get('/api/admin/users');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body));
    const json = JSON.stringify(r.body);
    assert.ok(!json.includes('$2'), 'no debe haber hash bcrypt ($2a/$2b)');
    assert.ok(!/["']password["']\s*:/.test(json), 'campo password no debe aparecer');
  });

  it('Seed-users con password débil → 400', async () => {
    const r = await saClient.post('/api/admin/seed-users', { count: 2, password: '123456' });
    assert.equal(r.status, 400);
  });

  it('Seed-users con password fuerte → 200', async () => {
    const r = await saClient.post('/api/admin/seed-users', { count: 2, password: 'Str0ngSeed!' });
    assert.equal(r.status, 200);
  });

  it('Audit log contiene acciones registradas', async () => {
    const r = await saClient.get('/api/admin/audit-log');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body));
    assert.ok(r.body.length > 0);
    const actions = r.body.map((e) => e.action);
    assert.ok(actions.includes('user.genesis_register'));
    assert.ok(actions.includes('user.seed_generated'));
  });
});

describe('HTTP system-reset step-up', () => {
  let saClient;

  before(async () => {
    saClient = makeClient();
    await saClient.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
  });

  it('sin confirmPassword → 400', async () => {
    const r = await saClient.post('/api/admin/system-reset', { confirmation: 'RESET' });
    assert.equal(r.status, 400);
  });

  it('con password incorrecta → 403', async () => {
    const r = await saClient.post('/api/admin/system-reset', {
      confirmation: 'RESET',
      confirmPassword: 'WRONG',
    });
    assert.equal(r.status, 403);
  });
});

describe('HTTP 2FA backup code audit (T-SEC-2)', () => {
  let saBackup;
  let backupCodes;
  let totpSecret;

  before(async () => {
    // Estado previo: sa_int existe (genesis Sa, sin 2FA). Habilitamos 2FA sobre
    // él para capturar los backup codes en claro. NO wipeamos la BD para no
    // romper "HTTP 2FA flow" (que depende de sa_int sin 2FA). El cleanup del
    // `after` deja a sa_int otra vez sin 2FA.
    saBackup = makeClient();
    await saBackup.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });

    const setupRes = await saBackup.post('/api/auth/2fa/setup', {});
    const { totp } = await import('../server/totp.js');
    totpSecret = setupRes.body.secret;
    const enableRes = await saBackup.post('/api/auth/2fa/enable', {
      code: totp(totpSecret),
    });
    assert.equal(enableRes.status, 200);
    backupCodes = enableRes.body.backup_codes;
    assert.equal(backupCodes.length, 10);
  });

  after(async () => {
    // Cleanup: devolver sa_int al estado pre-2FA. login → TOTP verify → disable.
    // Necesario para que el describe "HTTP 2FA flow" pueda usar sa_int sin 2FA.
    const cleanup = makeClient();
    const login = await cleanup.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    assert.equal(login.body.requires_2fa, true);
    const { totp } = await import('../server/totp.js');
    const verify = await cleanup.post('/api/auth/2fa/verify', {
      temp_token: login.body.temp_token,
      code: totp(totpSecret),
    });
    assert.equal(verify.status, 200);
    const disable = await cleanup.post('/api/auth/2fa/disable', {
      password: 'StrongP4ss!',
      code: totp(totpSecret),
    });
    assert.equal(disable.status, 200);
  });

  it('Consume 1 backup code → audit backup_code.consumed con remaining=9', async () => {
    const c = makeClient();
    const login = await c.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    assert.equal(login.body.requires_2fa, true);

    const codeToUse = backupCodes[0];
    const r = await c.post('/api/auth/2fa/verify', {
      temp_token: login.body.temp_token,
      code: codeToUse,
    });
    assert.equal(r.status, 200);
    assert.ok(r.body.user);
    assert.equal(r.body.user.username, 'sa_int');

    const auditRes = await saBackup.get('/api/admin/audit-log');
    assert.equal(auditRes.status, 200);
    const consumedEvents = auditRes.body.filter((e) => e.action === 'backup_code.consumed');
    assert.ok(consumedEvents.length >= 1, 'debe existir al menos un backup_code.consumed');
    const lastConsumed = consumedEvents[0]; // DESC por id, newest first
    assert.equal(lastConsumed.meta.remaining, 9);
    assert.match(lastConsumed.meta.code_hash_prefix, /^[a-f0-9]{8}$/);
    assert.ok(lastConsumed.target, 'target debe estar presente');
  });

  it('Reuso de backup code ya consumido → 401 + audit backup_code.consume_failed', async () => {
    const c = makeClient();
    const login = await c.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    assert.equal(login.body.requires_2fa, true);

    const reusedCode = backupCodes[0]; // ya consumido en el test anterior
    const r = await c.post('/api/auth/2fa/verify', {
      temp_token: login.body.temp_token,
      code: reusedCode,
    });
    assert.equal(r.status, 401);

    const auditRes = await saBackup.get('/api/admin/audit-log');
    assert.equal(auditRes.status, 200);
    const failedEvents = auditRes.body.filter((e) => e.action === 'backup_code.consume_failed');
    assert.ok(failedEvents.length >= 1, 'debe existir al menos un backup_code.consume_failed');
    const lastFailed = failedEvents[0];
    assert.equal(lastFailed.meta.reason, 'no_match_or_already_used');
    assert.match(lastFailed.meta.code_hash_prefix, /^[a-f0-9]{8}$/);
  });

  it('Backup code inexistente (formato válido) → 401 + consume_failed', async () => {
    const c = makeClient();
    const login = await c.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    assert.equal(login.body.requires_2fa, true);

    // Nunca fue generado — hash no matcheará ninguna fila
    const fakeCode = 'ZZZZZ-AAAAA';
    const r = await c.post('/api/auth/2fa/verify', {
      temp_token: login.body.temp_token,
      code: fakeCode,
    });
    assert.equal(r.status, 401);

    const auditRes = await saBackup.get('/api/admin/audit-log');
    const failedEvents = auditRes.body.filter((e) => e.action === 'backup_code.consume_failed');
    assert.ok(failedEvents.length >= 2, 'se acumulan consume_failed (reuso + fake)');
  });

  it('TOTP code incorrecto sigue emitiendo user.2fa_verify_failed (no backup_code.*)', async () => {
    const c = makeClient();
    const login = await c.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    assert.equal(login.body.requires_2fa, true);

    const beforeCount = (await saBackup.get('/api/admin/audit-log'))
      .body.filter((e) => e.action === 'user.2fa_verify_failed').length;

    const r = await c.post('/api/auth/2fa/verify', {
      temp_token: login.body.temp_token,
      code: '000000',
    });
    assert.equal(r.status, 401);

    const afterCount = (await saBackup.get('/api/admin/audit-log'))
      .body.filter((e) => e.action === 'user.2fa_verify_failed').length;
    assert.equal(afterCount, beforeCount + 1, 'solo se emite user.2fa_verify_failed, no backup_code.consume_failed');
  });
});

describe('HTTP 2FA flow', () => {
  let sa2fa;

  before(async () => {
    // Reset BD
    const setup = makeClient();
    await setup.post('/api/login', { username: 'sa_int', password: 'StrongP4ss!' });
    await setup.post('/api/admin/system-reset', {
      confirmation: 'RESET',
      confirmPassword: 'StrongP4ss!',
    });
    // Re-registrar Sa con 2FA
    sa2fa = makeClient();
    const r = await sa2fa.post('/api/register', { username: 'sa_2fa', password: 'StrongP4ss!' });
    assert.equal(r.status, 200);
    await sa2fa.post('/api/login', { username: 'sa_2fa', password: 'StrongP4ss!' });
  });

  it('GET 2FA status inicial → enabled false', async () => {
    const r = await sa2fa.get('/api/auth/2fa/status');
    assert.equal(r.status, 200);
    assert.equal(r.body.enabled, false);
  });

  it('Setup 2FA devuelve secret + otpauth_url', async () => {
    const r = await sa2fa.post('/api/auth/2fa/setup', {});
    assert.equal(r.status, 200);
    assert.ok(r.body.secret);
    assert.match(r.body.otpauth_url, /^otpauth:\/\/totp\//);
  });

  it('Enable con código incorrecto → 401', async () => {
    const r = await sa2fa.post('/api/auth/2fa/enable', { code: '000000' });
    assert.equal(r.status, 401);
  });

  it('Enable con código correcto → 200 + 10 backup codes', async () => {
    const setup = await sa2fa.post('/api/auth/2fa/setup', {});
    const { totp } = await import('../server/totp.js');
    const code = totp(setup.body.secret);
    const r = await sa2fa.post('/api/auth/2fa/enable', { code });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.backup_codes));
    assert.equal(r.body.backup_codes.length, 10);
  });

  it('Tras habilitar, login devuelve requires_2fa=true', async () => {
    const c = makeClient();
    const r = await c.post('/api/login', { username: 'sa_2fa', password: 'StrongP4ss!' });
    assert.equal(r.status, 200);
    assert.equal(r.body.requires_2fa, true);
    assert.ok(r.body.temp_token);
  });

  it('2FA verify con código TOTP → sesión completa', async () => {
    // Re-setup + enable (idempotente via setup re-issue)
    const setup = await sa2fa.post('/api/auth/2fa/setup', {});
    const { totp } = await import('../server/totp.js');
    const code = totp(setup.body.secret);
    await sa2fa.post('/api/auth/2fa/enable', { code });

    // Login fresh
    const c2 = makeClient();
    const login = await c2.post('/api/login', { username: 'sa_2fa', password: 'StrongP4ss!' });
    assert.equal(login.body.requires_2fa, true);

    const freshCode = totp(setup.body.secret);
    const r = await c2.post('/api/auth/2fa/verify', {
      temp_token: login.body.temp_token,
      code: freshCode,
    });
    assert.equal(r.status, 200);
    assert.ok(r.body.user);
    assert.equal(r.body.user.username, 'sa_2fa');

    const me = await c2.get('/api/me');
    assert.equal(me.status, 200);
  });
});