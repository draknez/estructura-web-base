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