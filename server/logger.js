/**
 * Logger estructurado con redacción de secretos.
 *
 * Uso:
 *   import { log } from './logger.js';
 *   log.info('user.created', { userId: 1, password: 'secret' });
 *   // => {"ts":1234,"level":"info","event":"user.created","data":{"userId":1,"password":"[REDACTED]"}}
 *
 * Para producción se recomienda reemplazar por Pino/Winston. Este wrapper
 * emite JSON por stdout, parseable por cualquier colector (PM2, journald, etc).
 */

const SECRET_KEYS = new Set([
  'password', 'new_password', 'old_password', 'confirmPassword',
  'token', 'access_token', 'refresh_token', 'jwt',
  'cookie', 'authorization', 'x-access-token',
  'secret', 'api_key', 'apikey',
  'JWT_SECRET',
]);

function redact(value, depth = 0) {
  if (depth > 3) return '[...]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out = {};
  for (const k of Object.keys(value)) {
    if (SECRET_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof value[k] === 'object' && value[k] !== null) {
      out[k] = redact(value[k], depth + 1);
    } else {
      out[k] = value[k];
    }
  }
  return out;
}

function emit(level, event, data) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event: String(event).slice(0, 80),
    data: redact(data),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const log = {
  info: (event, data = {}) => emit('info', event, data),
  warn: (event, data = {}) => emit('warn', event, data),
  error: (event, data = {}) => emit('error', event, data),
  debug: (event, data = {}) => {
    if (process.env.LOG_LEVEL === 'debug') emit('debug', event, data);
  },
};