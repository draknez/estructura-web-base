/**
 * Migrador SQL declarativo.
 *
 * Convenciones:
 *   - Cada migración vive en server/migrations/NNN_nombre.sql
 *   - El runner aplica en orden lexicográfico
 *   - Se registra en la tabla `_migrations` con timestamp de aplicación
 *   - Si una migración ya está registrada, se salta (idempotente)
 *
 * Las migraciones deben ser:
 *   - Idempotentes (CREATE IF NOT EXISTS, etc) — por si se re-ejecuta
 *   - Sin transacciones explícitas (sql.js las maneja internamente)
 *   - Sin DROP sin WHERE — usar migraciones explícitas para eso
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export function runMigrations(db, logger = console) {
  // Tabla de tracking
  db.run(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`);

  const applied = new Set();
  const stmt = db.prepare('SELECT name FROM _migrations');
  while (stmt.step()) applied.add(stmt.getAsObject().name);
  stmt.free();

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn?.(`[migrator] No existe ${MIGRATIONS_DIR}, saltando.`);
    return { applied: [], skipped: 0 };
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  logger.log?.(`[migrator] Encontrados ${files.length} archivos: ${files.join(', ')}`);

  let appliedNow = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const fullPath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    // Separar por ';' seguido de fin de línea o fin de archivo.
// Es una heurística: no usar ';' dentro de strings/literals.
// Primero eliminamos líneas de comentario para que no contaminen el primer statement.
const cleanedSql = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

const statements = cleanedSql
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

if (process.env.MIGRATOR_DEBUG) {
  console.log(`[migrator:debug] ${file}:`);
  statements.forEach((s, i) => console.log(`  [${i}] ${s.slice(0, 80)}...`));
}

    logger.log?.(`[migrator] Aplicando ${file} (${statements.length} statements)...`);

    try {
      for (const stmtText of statements) {
        db.run(stmtText);
      }
      db.run('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', [file, Date.now()]);
      appliedNow++;
      logger.log?.(`[migrator] ✓ ${file}`);
    } catch (err) {
      logger.error?.(`[migrator] ✗ ${file}: ${err.message}`);
      throw err;
    }
  }

  return { applied: appliedNow, skipped: applied.size, total: files.length };
}

export function listMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => {
      const fullPath = path.join(MIGRATIONS_DIR, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const firstLine = content.split('\n').find((l) => l.trim().startsWith('--')) || '';
      return { file: f, description: firstLine.replace(/^--\s*/, '').trim() };
    });
}