/**
 * Audit log - registro persistente de acciones sensibles.
 *
 * Uso:
 *   import { audit } from './audit.js';
 *   audit(req.userId, 'user.toggle_status', targetId, { is_active: 0 });
 *
 * Diseño:
 *  - Tabla `audit_log` creada/migrada desde initDB() en server/index.js.
 *  - Nunca lanza errores: si el insert falla, sólo se loguea por consola
 *    para no interrumpir el flujo principal.
 *  - El `meta` se serializa como JSON para consultas forenses.
 *  - Índice sobre (actor_id, created_at) y (action) para queries rápidas.
 */

const REDACT_KEYS = new Set(['password', 'token', 'new_password', 'old_password', 'confirmPassword']);

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof obj[k] === 'object' && obj[k] !== null) {
      out[k] = redact(obj[k]);
    } else {
      out[k] = obj[k];
    }
  }
  return out;
}

export function audit(actorId, action, target, meta = {}) {
  try {
    if (!global.__balog_db) {
      if (process.env.AUDIT_DEBUG) console.error(`[audit] skip ${action}: db no inicializado`);
      return;
    }
    const stmt = global.__balog_db.prepare(
      `INSERT INTO audit_log (actor_id, action, target, meta, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    stmt.run([
      actorId ?? null,
      String(action).slice(0, 64),
      target == null ? null : String(target).slice(0, 64),
      JSON.stringify(redact(meta)),
      Date.now(),
    ]);
    stmt.free();
    global.__balog_db_save?.();
  } catch (err) {
    console.error(`[audit] fallo al registrar ${action}:`, err.message);
  }
}

export function listAudit({ limit = 100, actorId, action } = {}) {
  if (!global.__balog_db) return [];
  const filters = [];
  const params = [];
  if (actorId != null) { filters.push('actor_id = ?'); params.push(actorId); }
  if (action)        { filters.push('action = ?');    params.push(action); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const stmt = global.__balog_db.prepare(
    `SELECT id, actor_id, action, target, meta, created_at
     FROM audit_log
     ${where}
     ORDER BY id DESC
     LIMIT ?`
  );
  stmt.bind([...params, Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000)]);

  const out = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    try { row.meta = JSON.parse(row.meta); } catch { /* ignore */ }
    out.push(row);
  }
  stmt.free();
  return out;
}