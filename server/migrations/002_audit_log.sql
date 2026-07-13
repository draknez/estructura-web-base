-- 002_audit_log.sql
-- Registro persistente de acciones sensibles para forensia

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_time ON audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action);