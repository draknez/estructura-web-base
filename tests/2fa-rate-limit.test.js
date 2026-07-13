/**
 * Verifica que el rate-limit de /api/auth/2fa/verify se dispara tras N intentos
 * fallidos (default 5 / 15min). Este test NO desactiva TEST_DISABLE_RATE_LIMIT,
 * a diferencia de integration.test.js, para validar la protección real.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Setup env ANTES de importar server — NO ponemos TEST_DISABLE_RATE_LIMIT.
const TMP_DB = path.join(
  import.meta.dirname,
  '.tmp',
  `rl-${process.pid}-${Date.now()}.sqlite`
);
fs.mkdirSync(path.dirname(TMP_DB), { recursive: true });
process.env.DB_PATH = TMP_DB;
process.env.PORT = String(31000 + Math.floor(Math.random() * 1000));
process.env.HOST = '127.0.0.1';
process.env.ALLOW_PUBLIC_REGISTER = 'true';
process.env.JWT_SECRET = 'rate-limit-test-secret-with-at-least-32-chars-XYZ';
process.env.NODE_ENV = 'test';

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

async function postJSON(p, body) {
  const res = await fetch(`${baseUrl}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, body: data };
}

describe('Rate limit /api/auth/2fa/verify', () => {
  it('bloquea tras 5 intentos fallidos con temp_token inválido (mismo username)', async () => {
    // Mismo username para que la key del limiter se acumule.
    const forgedTempToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ2aWN0aW0iLCJwdXJwb3NlIjoiMmZhIn0.invalidsig';

    const statuses = [];
    for (let i = 0; i < 7; i++) {
      const r = await postJSON('/api/auth/2fa/verify', {
        temp_token: forgedTempToken,
        code: '000000',
      });
      statuses.push(r.status);
    }

    // Primeros 5 intentos pasan el limiter (responden 401 por código malo).
    // A partir del 6º debe responder 429.
    const okStatuses = statuses.slice(0, 5);
    const limitedStatuses = statuses.slice(5);

    assert.ok(
      okStatuses.every((s) => s === 401),
      `los 5 primeros intentos deberían ser 401, fueron: ${okStatuses.join(',')}`
    );
    assert.ok(
      limitedStatuses.every((s) => s === 429),
      `los intentos 6-7 deberían ser 429 (rate-limited), fueron: ${limitedStatuses.join(',')}`
    );
  });

  it('clave del limiter es (IP, username): username distinto resetea la cuota', async () => {
    // Misma IP (loopback), distinto username en el token.
    // El limiter lee `username` del payload (no `name`).
    const tokenA =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibmFtZSI6ImFsaWNlIiwicHVycG9zZSI6IjJmYSJ9.sig';
    const tokenB =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywibmFtZSI6ImJvYiIsInB1cnBvc2UiOiIyZmEifQ.sig';
    const tokenVictim =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ2aWN0aW0iLCJwdXJwb3NlIjoiMmZhIn0.sig';

    // alice y bob: usernames distintos al "victim" del test anterior → cuota fresca.
    const rAlice = await postJSON('/api/auth/2fa/verify', {
      temp_token: tokenA,
      code: '000000',
    });
    assert.notEqual(
      rAlice.status,
      429,
      `alice no debería estar rate-limited en su primer intento, fue ${rAlice.status}`
    );
    assert.equal(rAlice.status, 401);

    const rBob = await postJSON('/api/auth/2fa/verify', {
      temp_token: tokenB,
      code: '000000',
    });
    assert.notEqual(
      rBob.status,
      429,
      `bob no debería estar rate-limited en su primer intento, fue ${rBob.status}`
    );

    // victim sigue bloqueada por el test anterior (mismo username 'victim').
    const rVictim = await postJSON('/api/auth/2fa/verify', {
      temp_token: tokenVictim,
      code: '000000',
    });
    assert.equal(rVictim.status, 429, 'victim debería seguir bloqueada');
  });
});
