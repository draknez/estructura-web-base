import express from 'express';
import initSqlJs from 'sql.js';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import { Validators } from './validators.js';
import { audit, listAudit } from './audit.js';
import { runMigrations } from './migrator.js';
import {
  generateSecret,
  verifyTotp,
  otpauthUrl,
  generateBackupCodes,
  hashBackupCode,
} from './totp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const SECRET_KEY = process.env.JWT_SECRET || '';
const BCRYPT_ROUNDS = Math.min(Math.max(parseInt(process.env.BCRYPT_ROUNDS, 10) || 12, 4), 15);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOW_PUBLIC_REGISTER = (process.env.ALLOW_PUBLIC_REGISTER || 'true') === 'true';
const IS_PROD = process.env.NODE_ENV === 'production';
const DB_FILE = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'database.sqlite');

const COOKIE_NAME = 'balog_token';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: IS_PROD ? 'strict' : 'lax',
  secure: IS_PROD,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

// ============================================
// BOOT-TIME GUARDRAILS (Fail fast)
// ============================================
if (!SECRET_KEY || SECRET_KEY.length < 32 || SECRET_KEY === 'replace-with-a-long-random-string') {
  console.error('\n╔══════════════════════════════════════════════════════════════╗');
  console.error('║  ❌ JWT_SECRET inseguro o ausente                            ║');
  console.error('║                                                              ║');
  console.error('║  Define JWT_SECRET en tu .env con al menos 32 caracteres      ║');
  console.error('║  aleatorios. Ejemplo:                                        ║');
  console.error('║    node -e "console.log(require(\'crypto\')                   ║');
  console.error('║      .randomBytes(48).toString(\'base64\'))"                  ║');
  console.error('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}

if (!/^([0-9]{1,3}\.){3}[0-9]{1,3}$|^localhost$|^127\.0\.0\.1$/.test(HOST) && HOST !== '0.0.0.0') {
  console.error(`❌ HOST inválido: ${HOST}`);
  process.exit(1);
}

// ============================================
// APP & SECURITY MIDDLEWARES
// ============================================
const app = express();

// Helmet: CSP, X-Frame-Options, X-Content-Type-Options, etc.
app.use(
  helmet({
    contentSecurityPolicy: IS_PROD
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
          },
        }
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", 'ws://localhost:5173', 'http://localhost:5173', 'http://127.0.0.1:5173'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
          },
        },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// CORS estricto desde env
app.use(
  cors({
    origin: (origin, cb) => {
      // Permitir herramientas sin origin (curl, server-to-server) y orígenes whitelisted
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-access-token'],
  })
);

app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

// ============================================
// RATE LIMITERS
// ============================================
const TESTING = !!process.env.TEST_DISABLE_RATE_LIMIT;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: TESTING ? 100000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' },
});

// Status público: presupuesto generoso porque HomePage hace polling cada 5s
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: TESTING ? 100000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas de estado. Reduzca la frecuencia.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: TESTING ? 100000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const u = (req.body && typeof req.body.username === 'string')
      ? req.body.username.trim().toLowerCase()
      : '';
    return `auth::${ipKeyGenerator(req.ip)}::${u}`;
  },
  message: { error: 'Demasiados intentos de inicio de sesión. Bloqueado por 15 minutos.' },
});

const seedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: TESTING ? 100000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas ejecuciones del generador de usuarios. Espere 1 hora.' },
});

// 2FA code verification: 6 dígitos = 1M combinaciones, hay que rate-limitar.
// Key = IP + username extraído del temp_token (sin verificar firma; basta para
// agrupar intentos). Si el temp_token es inválido, se agrupa por '' igualmente
// (atacante con token basura sigue consumiendo cuota por IP).
const verify2FALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: TESTING ? 100000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    let username = '';
    try {
      const decoded = jwt.decode(req.body && req.body.temp_token);
      if (decoded && typeof decoded.username === 'string') {
        username = decoded.username.trim().toLowerCase();
      }
    } catch {
      /* token malformado: agrupamos por IP solo */
    }
    return `2fa-verify::${ipKeyGenerator(req.ip)}::${username}`;
  },
  message: { error: 'Demasiados intentos de código 2FA. Bloqueado por 15 minutos.' },
});

// Setup/Enable: también valida un código TOTP. Misma protección pero separado
// porque las claves del usuario son distintas (sesión completa vs temp_token).
const enable2FALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: TESTING ? 100000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `2fa-enable::${ipKeyGenerator(req.ip)}::${req.userId || ''}`,
  message: { error: 'Demasiados intentos de activación 2FA. Bloqueado por 15 minutos.' },
});

// ============================================
// DB INIT
// ============================================
let db;
const onlineUsers = new Set();

async function initDB() {
  if (process.env.AUDIT_DEBUG) console.log('[initDB] start');
  const SQL = await initSqlJs();
  let needsSave = false;
  if (process.env.AUDIT_DEBUG) console.log('[initDB] SQL.js loaded');

  // Pre-asignar handles para que audit.js pueda insertar durante la migración.
  global.__balog_db = db;
  global.__balog_db_save = saveDB;

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
    db.run('PRAGMA foreign_keys = ON;');
    console.log('✅ Base de datos cargada');
  } else {
    db = new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');
    console.log('⚠️ Nueva base de datos creada');
    needsSave = true;
  }

  // Publicar handles para módulos (audit.js) ANTES de correr migraciones
  // por si alguna migración dispara un evento auditado.
  global.__balog_db = db;
  global.__balog_db_save = saveDB;

  // Migraciones formales (idempotentes, tracked en _migrations)
  const migResult = runMigrations(db, console);
  if (migResult.applied > 0) {
    console.log(`📦 Migraciones aplicadas: ${migResult.applied} (total: ${migResult.total})`);
    needsSave = true;
  }

  if (needsSave) saveDB();

  if (process.env.AUDIT_DEBUG) console.log(`[initDB] done. db=${!!db} global.__balog_db=${!!global.__balog_db}`);
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

initDB();

// Exponer db y saveDB a módulos (audit.js) — también se re-asigna dentro de
// initDB() para cubrir el caso de inicialización async.
// (No-op si initDB aún no resolvió, pero los endpoints ya esperan a la BD.)

// ============================================
// HELPERS
// ============================================

function safeError(res, err, fallback = 'Error interno del servidor') {
  const status = Number.isInteger(err && err.status) ? err.status : 500;
  if (status >= 500) console.error('API error:', err);
  const message = status < 500 && err && err.message ? err.message : fallback;
  return res.status(status).json({ error: message });
}

function badRequest(message) {
  const e = new Error(message);
  e.status = 400;
  return e;
}

function parsePositiveInt(value, fieldName) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0 || String(n) !== String(value).trim()) {
    throw badRequest(`ID inválido: ${fieldName}`);
  }
  return n;
}

function getRolesForUser(userId) {
  const stmt = db.prepare(`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
  `);
  stmt.bind([userId]);
  const roles = [];
  while (stmt.step()) roles.push(stmt.getAsObject().name);
  stmt.free();
  return roles;
}

function getGroupDepth(parentId, currentDepth = 1) {
  if (!parentId) return currentDepth;
  const stmt = db.prepare('SELECT parent_id FROM groups WHERE id = ?');
  stmt.bind([parentId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    if (row.parent_id == null) return currentDepth + 1;
    return getGroupDepth(row.parent_id, currentDepth + 1);
  }
  stmt.free();
  return currentDepth;
}

const MAX_GROUP_DEPTH = 5;

function getRequesterGroup(userId) {
  const stmt = db.prepare('SELECT group_id FROM users WHERE id = ?');
  stmt.bind([userId]);
  let groupId = null;
  if (stmt.step()) groupId = stmt.getAsObject().group_id;
  stmt.free();
  return groupId;
}

function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
}

function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: COOKIE_OPTS.path });
}

// ============================================
// AUTH MIDDLEWARES
// ============================================

const verifyToken = (req, res, next) => {
  const cookieToken = req.cookies && req.cookies[COOKIE_NAME];
  const headerToken =
    req.headers['x-access-token'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = cookieToken || headerToken;

  if (!token) return res.status(401).json({ error: 'No autenticado.' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token inválido o expirado.' });

    // Validar token_version contra la BD (permite revocación)
    const stmt = db.prepare('SELECT username, token_version, is_active FROM users WHERE id = ?');
    stmt.bind([decoded.id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
    const row = stmt.getAsObject();
    stmt.free();

    if (row.token_version !== decoded.tv) {
      return res.status(401).json({ error: 'Token revocado.' });
    }
    if (row.is_active !== 1) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }

    req.userId = decoded.id;
    req.userRoles = decoded.roles;
    req.username = row.username;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  if (!req.userRoles || !req.userRoles.includes('adm')) {
    return res.status(403).json({ error: 'Requiere rol de Administrador' });
  }
  next();
};

const verifySuperAdmin = (req, res, next) => {
  if (!req.userRoles || !req.userRoles.includes('Sa')) {
    return res.status(403).json({ error: 'Requiere rol de SuperAdmin' });
  }
  next();
};

// Middleware: chequea que target user está en el mismo grupo que requester (o requester es Sa)
function sameGroupOrSa(getTargetGroupId) {
  return (req, res, next) => {
    const isSa = req.userRoles && req.userRoles.includes('Sa');
    if (isSa) return next();
    const requesterGroupId = getRequesterGroup(req.userId);
    const targetGroupId = getTargetGroupId(req);
    if (requesterGroupId !== targetGroupId) {
      return res.status(403).json({ error: 'Solo puedes gestionar usuarios de tu mismo grupo.' });
    }
    next();
  };
}

// ============================================
// ENDPOINTS PÚBLICOS
// ============================================

app.get('/api/users/status', statusLimiter, (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.group_id, g.name as group_name
      FROM users u
      LEFT JOIN groups g ON u.group_id = g.id
      WHERE u.is_active = 1
      AND u.id NOT IN (
        SELECT ur.user_id
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'Sa'
      )
    `;
    const stmt = db.prepare(query);
    const users = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      users.push({
        username: row.username,
        group_name: row.group_name || null,
        online: onlineUsers.has(row.username),
      });
    }
    stmt.free();
    res.json(users);
  } catch (err) {
    safeError(res, err);
  }
});

// REGISTER
app.post('/api/register', authLimiter, (req, res) => {
  if (!ALLOW_PUBLIC_REGISTER) {
    return res.status(403).json({ error: 'Registro público deshabilitado. Contacte al administrador.' });
  }

  const { username, password } = req.body;

  const validationError = Validators.validate({ username, password }, {
    username: Validators.username,
    password: Validators.password,
  });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    countStmt.step();
    const userCount = countStmt.getAsObject().count;
    countStmt.free();
    const isFirstUser = userCount === 0;

    const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);

    let userId;
    try {
      db.run('INSERT INTO users (username, password, is_active, token_version) VALUES (?, ?, 1, 1)', [
        username,
        hashedPassword,
      ]);
      const resId = db.exec('SELECT last_insert_rowid() as id');
      userId = resId[0].values[0][0];
    } catch (e) {
      // Username duplicado (UNIQUE constraint)
      if (String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'El usuario ya existe.' });
      }
      throw e;
    }

    const rolesToAssign = ['usr'];
    if (isFirstUser) {
      rolesToAssign.push('adm');
      rolesToAssign.push('Sa');
    }

    for (const roleName of rolesToAssign) {
      const stmtRole = db.prepare('SELECT id FROM roles WHERE name = :name');
      const roleRow = stmtRole.getAsObject({ ':name': roleName });
      stmtRole.free();
      if (roleRow.id) {
        db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleRow.id]);
      }
    }

    saveDB();
    const roles = getRolesForUser(userId);
    const token = jwt.sign(
      { id: userId, username, roles, tv: 1 },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    onlineUsers.add(username);
    setTokenCookie(res, token);

    audit(userId, isFirstUser ? 'user.genesis_register' : 'user.register', userId, {
      is_first_user: isFirstUser,
      roles,
      ip: req.ip,
    });

    res.json({ user: { id: userId, username, roles } });
  } catch (err) {
    safeError(res, err, 'Error al registrar el usuario.');
  }
});

// LOGIN
app.post('/api/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  try {
    const stmt = db.prepare(
      'SELECT id, username, password, is_active, token_version, totp_enabled FROM users WHERE username = :username'
    );
    const user = stmt.getAsObject({ ':username': username });
    stmt.free();

    if (!user || !user.id) {
      audit(null, 'user.login_failed', username, { reason: 'not_found', ip: req.ip });
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      audit(user.id, 'user.login_failed', username, { reason: 'bad_password', ip: req.ip });
      return res.status(401).json({ error: 'Clave incorrecta' });
    }
    if (user.is_active !== 1) {
      audit(user.id, 'user.login_failed', username, { reason: 'inactive', ip: req.ip });
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    const roles = getRolesForUser(user.id);

    // 2FA: si está habilitada, emitir token temporal (5 min) que sólo sirve
    // para canjear por sesión completa en /api/auth/2fa/verify.
    if (user.totp_enabled === 1) {
      const tempToken = jwt.sign(
        { id: user.id, username: user.username, purpose: '2fa' },
        SECRET_KEY,
        { expiresIn: '5m' }
      );
      audit(user.id, 'user.login_2fa_required', user.id, { ip: req.ip });
      return res.json({ requires_2fa: true, temp_token: tempToken });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, roles, tv: user.token_version },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    onlineUsers.add(user.username);
    setTokenCookie(res, token);

    audit(user.id, 'user.login_success', user.id, { ip: req.ip });

    res.json({ user: { id: user.id, username: user.username, roles } });
  } catch (err) {
    console.error('Login Error:', err);
    return safeError(res, err, 'Error interno del servidor');
  }
});

// LOGOUT — ahora requiere auth y usa req.username
app.post('/api/logout', verifyToken, (req, res) => {
  audit(req.userId, 'user.logout', req.userId, { username: req.username });
  onlineUsers.delete(req.username);
  clearTokenCookie(res);
  res.json({ success: true });
});

// ============================================
// 2FA (TOTP) — solo SuperAdmin
// ============================================

// Middleware: verifica token con purpose='2fa'
function verifyTemp2FAToken(req, res, next) {
  const { temp_token } = req.body;
  if (typeof temp_token !== 'string' || !temp_token) {
    return res.status(400).json({ error: 'temp_token requerido.' });
  }
  jwt.verify(temp_token, SECRET_KEY, (err, decoded) => {
    if (err || decoded.purpose !== '2fa' || !decoded.id) {
      return res.status(401).json({ error: 'Token 2FA inválido o expirado.' });
    }
    req.userId = decoded.id;
    req.username = decoded.username;
    req.userRoles = []; // sin roles hasta verificar
    next();
  });
}

// GET status 2FA del usuario actual
app.get('/api/auth/2fa/status', verifyToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT totp_enabled FROM users WHERE id = ?');
    stmt.bind([req.userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const enabled = stmt.getAsObject().totp_enabled === 1;
    stmt.free();
    res.json({ enabled });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/auth/2fa/setup — genera secreto y otpauth URL (sin habilitar todavía)
app.post('/api/auth/2fa/setup', apiLimiter, verifyToken, verifySuperAdmin, (req, res) => {
  try {
    const secret = generateSecret();
    // Guardamos provisionalmente sin habilitar, hasta verificar con /enable.
    db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, req.userId]);
    saveDB();

    const url = otpauthUrl({
      issuer: 'BaLog',
      account: req.username,
      secret,
    });

    audit(req.userId, 'user.2fa_setup_initiated', req.userId, {});

    res.json({
      secret,
      otpauth_url: url,
      digits: 6,
      period: 30,
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/auth/2fa/enable — confirma código y activa 2FA + emite backup codes
app.post('/api/auth/2fa/enable', apiLimiter, enable2FALimiter, verifyToken, verifySuperAdmin, (req, res) => {
  try {
    const { code } = req.body;
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Código de 6 dígitos requerido.' });
    }

    const stmt = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?');
    stmt.bind([req.userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const row = stmt.getAsObject();
    stmt.free();

    if (!row.totp_secret) {
      return res.status(400).json({ error: 'Primero ejecuta /api/auth/2fa/setup.' });
    }
    if (row.totp_enabled === 1) {
      return res.status(409).json({ error: '2FA ya está habilitado.' });
    }

    if (!verifyTotp(row.totp_secret, code)) {
      audit(req.userId, 'user.2fa_enable_failed', req.userId, { reason: 'bad_code' });
      return res.status(401).json({ error: 'Código inválido.' });
    }

    // Habilitar y generar backup codes (mostrados una sola vez)
    const backupCodes = generateBackupCodes(10);
    db.run('UPDATE users SET totp_enabled = 1, totp_enabled_at = ? WHERE id = ?', [
      Date.now(),
      req.userId,
    ]);
    for (const code of backupCodes) {
      db.run('INSERT INTO backup_codes (user_id, code_hash, created_at) VALUES (?, ?, ?)', [
        req.userId,
        hashBackupCode(code),
        Date.now(),
      ]);
    }
    saveDB();

    audit(req.userId, 'user.2fa_enabled', req.userId, { backup_codes_generated: backupCodes.length });

    res.json({
      success: true,
      backup_codes: backupCodes, // ÚNICA VEZ que se muestran en claro
      message: '2FA habilitado. Guarda los backup codes en un lugar seguro.',
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/auth/2fa/verify — canjea temp_token + código TOTP por sesión completa
app.post('/api/auth/2fa/verify', apiLimiter, verify2FALimiter, verifyTemp2FAToken, (req, res) => {
  try {
    const { code } = req.body;
    if (typeof code !== 'string') {
      return res.status(400).json({ error: 'code requerido.' });
    }

    const stmt = db.prepare(
      'SELECT id, username, is_active, token_version, totp_enabled, totp_secret FROM users WHERE id = ?'
    );
    stmt.bind([req.userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }
    const user = stmt.getAsObject();
    stmt.free();

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }
    if (user.totp_enabled !== 1 || !user.totp_secret) {
      return res.status(400).json({ error: '2FA no habilitado.' });
    }

    let verified = false;

    // Aceptar código TOTP o backup code
    if (/^\d{6}$/.test(code)) {
      verified = verifyTotp(user.totp_secret, code);
    } else if (/^[A-Z0-9]{5}-[A-Z0-9]{5}$/i.test(code)) {
      const hashed = hashBackupCode(code);
      const bcStmt = db.prepare(
        'SELECT id FROM backup_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL LIMIT 1'
      );
      bcStmt.bind([user.id, hashed]);
      if (bcStmt.step()) {
        const bcId = bcStmt.getAsObject().id;
        bcStmt.free();
        db.run('UPDATE backup_codes SET used_at = ? WHERE id = ?', [Date.now(), bcId]);
        verified = true;
      } else {
        bcStmt.free();
      }
    }

    if (!verified) {
      audit(user.id, 'user.2fa_verify_failed', user.id, { ip: req.ip });
      return res.status(401).json({ error: 'Código inválido.' });
    }

    const roles = getRolesForUser(user.id);
    const token = jwt.sign(
      { id: user.id, username: user.username, roles, tv: user.token_version },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    onlineUsers.add(user.username);
    setTokenCookie(res, token);

    audit(user.id, 'user.2fa_verified', user.id, {
      method: /^\d{6}$/.test(code) ? 'totp' : 'backup_code',
      ip: req.ip,
    });

    res.json({ user: { id: user.id, username: user.username, roles } });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/auth/2fa/disable — desactiva 2FA con confirmación de password + código
app.post('/api/auth/2fa/disable', apiLimiter, verifyToken, verifySuperAdmin, (req, res) => {
  try {
    const { password, code } = req.body;

    if (typeof password !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'password y code requeridos.' });
    }

    const stmt = db.prepare(
      'SELECT password, totp_enabled, totp_secret FROM users WHERE id = ?'
    );
    stmt.bind([req.userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const row = stmt.getAsObject();
    stmt.free();

    if (row.totp_enabled !== 1) {
      return res.status(400).json({ error: '2FA no está habilitado.' });
    }

    if (!bcrypt.compareSync(password, row.password)) {
      audit(req.userId, 'user.2fa_disable_failed', req.userId, { reason: 'bad_password' });
      return res.status(403).json({ error: 'Contraseña incorrecta.' });
    }
    if (!verifyTotp(row.totp_secret, code)) {
      audit(req.userId, 'user.2fa_disable_failed', req.userId, { reason: 'bad_code' });
      return res.status(401).json({ error: 'Código 2FA inválido.' });
    }

    db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_enabled_at = NULL WHERE id = ?', [
      req.userId,
    ]);
    db.run('DELETE FROM backup_codes WHERE user_id = ?', [req.userId]);
    saveDB();

    audit(req.userId, 'user.2fa_disabled', req.userId, {});

    res.json({ success: true });
  } catch (err) {
    safeError(res, err);
  }
});

// ME — devuelve el usuario autenticado (para refresh en frontend)
app.get('/api/me', verifyToken, (req, res) => {
  const stmt = db.prepare('SELECT id, username, is_active FROM users WHERE id = ?');
  stmt.bind([req.userId]);
  if (!stmt.step()) {
    stmt.free();
    clearTokenCookie(res);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const row = stmt.getAsObject();
  stmt.free();
  if (row.is_active !== 1) {
    return res.status(403).json({ error: 'Cuenta desactivada' });
  }
  res.json({ user: { id: row.id, username: row.username, roles: req.userRoles } });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

app.get('/api/admin/users', apiLimiter, verifyToken, verifyAdmin, (req, res) => {
  try {
    const isSuperAdmin = req.userRoles.includes('Sa');
    let query = `
      SELECT u.id, u.username, u.is_active, u.group_id, g.name as group_name
      FROM users u
      LEFT JOIN groups g ON u.group_id = g.id
    `;
    const params = [];

    if (!isSuperAdmin) {
      const requesterGroupId = getRequesterGroup(req.userId);
      if (requesterGroupId) {
        query += ' WHERE u.group_id = ?';
        params.push(requesterGroupId);
      } else {
        query += ' WHERE u.group_id IS NULL';
      }
    }

    const stmt = db.prepare(query);
    stmt.bind(params);

    const users = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const roles = getRolesForUser(row.id);
      if (roles.includes('Sa')) continue; // Ocultar SuperAdmins
      users.push({
        ...row,
        roles,
        online: onlineUsers.has(row.username),
        isAdmin: roles.includes('adm'),
      });
    }
    stmt.free();
    res.json(users);
  } catch (err) {
    safeError(res, err);
  }
});

// TOGGLE ROLE — con scope check
app.post('/api/admin/toggle-role', apiLimiter, verifyToken, verifyAdmin, (req, res) => {
  try {
    const { targetUserId, roleName } = req.body;

    const targetId = parsePositiveInt(targetUserId, 'targetUserId');
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'No puedes modificar tu propio rol.' });
    }
    if (roleName !== 'adm') {
      return res.status(400).json({ error: "Sólo se permite alternar el rol 'adm'." });
    }

    // Scope check
    const isSa = req.userRoles.includes('Sa');
    if (!isSa) {
      const reqGroup = getRequesterGroup(req.userId);
      const targetGroup = getRequesterGroup(targetId);
      if (reqGroup !== targetGroup) {
        return res.status(403).json({ error: 'Solo puedes gestionar usuarios de tu mismo grupo.' });
      }
    }

    const stmtRole = db.prepare('SELECT id FROM roles WHERE name = :name');
    const role = stmtRole.getAsObject({ ':name': roleName });
    stmtRole.free();
    if (!role.id) return res.status(400).json({ error: 'Rol no existe' });

    const checkStmt = db.prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?');
    checkStmt.bind([targetId, role.id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      db.run('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [targetId, role.id]);
    } else {
      db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [targetId, role.id]);
    }

    // Revocar tokens del target user (forzar re-login)
    db.run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [targetId]);
    saveDB();

    audit(req.userId, exists ? 'user.role_removed' : 'user.role_granted', targetId, {
      role: roleName,
    });

    res.json({ success: true });
  } catch (err) {
    safeError(res, err);
  }
});

// TOGGLE STATUS
app.post('/api/admin/toggle-status', apiLimiter, verifyToken, verifyAdmin, (req, res) => {
  try {
    const targetId = parsePositiveInt(req.body.targetUserId, 'targetUserId');
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }

    const isSuperAdmin = req.userRoles.includes('Sa');
    if (!isSuperAdmin) {
      const reqGroup = getRequesterGroup(req.userId);
      const targetGroup = getRequesterGroup(targetId);
      if (reqGroup !== targetGroup) {
        return res.status(403).json({ error: 'Solo puedes gestionar usuarios de tu mismo grupo.' });
      }
    }

    const stmt = db.prepare('SELECT is_active, username FROM users WHERE id = ?');
    stmt.bind([targetId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const row = stmt.getAsObject();
    stmt.free();

    const newStatus = row.is_active === 1 ? 0 : 1;
    db.run('UPDATE users SET is_active = ?, token_version = token_version + 1 WHERE id = ?', [
      newStatus,
      targetId,
    ]);
    saveDB();

    if (newStatus === 0) onlineUsers.delete(row.username);

    audit(req.userId, newStatus === 0 ? 'user.deactivated' : 'user.activated', targetId, {
      username: row.username,
    });

    res.json({ success: true, newStatus });
  } catch (err) {
    safeError(res, err);
  }
});

// EDIT USER — whitelist + Validators
const ALLOWED_USER_FIELDS = ['username', 'password', 'group_id'];

app.put(
  '/api/admin/user/:id',
  apiLimiter,
  verifyToken,
  verifyAdmin,
  sameGroupOrSa((req) => getRequesterGroup(parseInt(req.params.id, 10))),
  (req, res) => {
    try {
      const targetId = parsePositiveInt(req.params.id, 'id');

      // Whitelist
      const bodyKeys = Object.keys(req.body || {});
      const invalidKeys = bodyKeys.filter((k) => !ALLOWED_USER_FIELDS.includes(k));
      if (invalidKeys.length > 0) {
        return res.status(400).json({ error: `Campos no permitidos: ${invalidKeys.join(', ')}` });
      }

      const { username, password, group_id } = req.body;

      // Admin regular no puede reasignarse a sí mismo fuera de su grupo (anti-escape)
      const isSa = req.userRoles.includes('Sa');
      if (!isSa && targetId === req.userId && group_id !== undefined && group_id !== null) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio grupo.' });
      }

      const updates = [];
      const values = [];

      if (group_id !== undefined) {
        if (group_id !== null && group_id !== '') {
          const gid = parsePositiveInt(group_id, 'group_id');
          const groupStmt = db.prepare('SELECT id FROM groups WHERE id = ?');
          groupStmt.bind([gid]);
          if (!groupStmt.step()) {
            groupStmt.free();
            return res.status(400).json({ error: 'El grupo especificado no existe.' });
          }
          groupStmt.free();
          updates.push('group_id = ?');
          values.push(gid);
        } else {
          updates.push('group_id = ?');
          values.push(null);
        }
      }

      if (username !== undefined) {
        const usernameError = Validators.username(username);
        if (usernameError !== true) {
          return res.status(400).json({ error: usernameError });
        }
        // Unicidad (UNIQUE constraint es la red de seguridad; chequeo previo es solo UX)
        const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?');
        dup.bind([username, targetId]);
        if (dup.step()) {
          dup.free();
          return res.status(409).json({ error: 'El nombre de usuario ya está en uso.' });
        }
        dup.free();
        updates.push('username = ?');
        values.push(username);
      }

      if (password !== undefined && password !== null && String(password).trim() !== '') {
        const passwordError = Validators.password(password);
        if (passwordError !== true) {
          return res.status(400).json({ error: passwordError });
        }
        const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);
        updates.push('password = ?');
        values.push(hashedPassword);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No hay campos válidos para actualizar.' });
      }

      values.push(targetId);
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

      // Cambio de username/password/grupo → invalidar tokens existentes del target
      db.run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [targetId]);

      saveDB();

      audit(req.userId, 'user.updated', targetId, { changed_fields: updates.map((u) => u.split(' = ')[0]) });

      res.json({ success: true });
    } catch (err) {
      safeError(res, err);
    }
  }
);

// CREATE USER (admin)
app.post('/api/admin/users', apiLimiter, verifyToken, verifyAdmin, (req, res) => {
  try {
    const { username, password } = req.body;

    const validationError = Validators.validate({ username, password }, {
      username: Validators.username,
      password: Validators.password,
    });
    if (validationError) return res.status(400).json({ error: validationError });

    const isSuperAdmin = req.userRoles.includes('Sa');
    let autoGroupId = null;
    if (!isSuperAdmin) {
      autoGroupId = getRequesterGroup(req.userId);
    }

    const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);

    let userId;
    try {
      db.run('INSERT INTO users (username, password, is_active, group_id, token_version) VALUES (?, ?, 1, ?, 1)', [
        username,
        hashedPassword,
        autoGroupId,
      ]);
      const resId = db.exec('SELECT last_insert_rowid() as id');
      userId = resId[0].values[0][0];
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'El usuario ya existe.' });
      }
      throw e;
    }

    const stmtRole = db.prepare("SELECT id FROM roles WHERE name = 'usr'");
    if (stmtRole.step()) {
      const roleUsrId = stmtRole.getAsObject().id;
      db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleUsrId]);
    }
    stmtRole.free();

    saveDB();
    audit(req.userId, 'user.admin_created', userId, { username, group_id: autoGroupId });
    res.json({ success: true, id: userId });
  } catch (err) {
    safeError(res, err);
  }
});

// DELETE USER (Sa only)
app.delete('/api/admin/user/:id', apiLimiter, verifyToken, verifySuperAdmin, (req, res) => {
  try {
    const targetId = parsePositiveInt(req.params.id, 'id');
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
    }

    const existsStmt = db.prepare('SELECT username FROM users WHERE id = ?');
    existsStmt.bind([targetId]);
    if (!existsStmt.step()) {
      existsStmt.free();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const targetUsername = existsStmt.getAsObject().username;
    existsStmt.free();

    // Limpiar grupos donde era líder
    db.run('UPDATE groups SET leader_id = NULL WHERE leader_id = ?', [targetId]);

    db.run('DELETE FROM users WHERE id = ?', [targetId]);
    saveDB();

    onlineUsers.delete(targetUsername);
    audit(req.userId, 'user.deleted', targetId, { username: targetUsername });
    res.json({ success: true });
  } catch (err) {
    safeError(res, err);
  }
});

// AUDIT LOG (Sa only)
app.get('/api/admin/audit-log', apiLimiter, verifyToken, verifySuperAdmin, (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const actorId = req.query.actorId ? parseInt(req.query.actorId, 10) : undefined;
    const action = req.query.action ? String(req.query.action) : undefined;
    const rows = listAudit({ limit, actorId, action });
    res.json(rows);
  } catch (err) {
    safeError(res, err);
  }
});

// SYSTEM RESET (Sa only + step-up auth)
app.post('/api/admin/system-reset', apiLimiter, verifyToken, verifySuperAdmin, (req, res) => {
  try {
    const { confirmation, confirmPassword } = req.body;

    if (confirmation !== 'RESET') {
      return res.status(400).json({ error: "Debe confirmar con el texto 'RESET'." });
    }

    if (typeof confirmPassword !== 'string' || confirmPassword.length === 0) {
      return res.status(400).json({ error: 'Debe re-ingresar su contraseña para confirmar.' });
    }

    // Step-up auth: re-validar la contraseña del Sa actual
    const stmt = db.prepare('SELECT password FROM users WHERE id = ?');
    stmt.bind([req.userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: 'Sesión inválida.' });
    }
    const row = stmt.getAsObject();
    stmt.free();

    if (!bcrypt.compareSync(confirmPassword, row.password)) {
      return res.status(403).json({ error: 'Contraseña de confirmación incorrecta.' });
    }

    console.warn(`⚠️ SYSTEM RESET INICIADO POR USUARIO ID ${req.userId}`);

    // Audit ANTES de borrar (luego el actor también desaparecerá).
    // Conservamos audit_log para post-mortem forense.
    audit(req.userId, 'system.reset_confirmed', req.userId, { ip: req.ip, destructive: true });

    db.run('DELETE FROM user_roles');
    db.run('DELETE FROM users');
    try {
      db.run("DELETE FROM sqlite_sequence WHERE name='users'");
    } catch (e) {
      /* tabla no existe */
    }

    onlineUsers.clear();
    clearTokenCookie(res);
    saveDB();

    console.log('♻️ SISTEMA REINICIADO A MODO FÁBRICA');
    res.json({ success: true, message: 'Sistema reiniciado correctamente.' });
  } catch (err) {
    console.error('Error en System Reset:', err);
    return safeError(res, err, 'Fallo crítico al reiniciar el sistema.');
  }
});

// SEED USERS
app.post('/api/admin/seed-users', apiLimiter, verifyToken, verifySuperAdmin, seedLimiter, (req, res) => {
  try {
    const { count = 10, password } = req.body;
    const limit = Math.min(Math.max(parseInt(count, 10) || 10, 1), 500);

    // Password obligatorio y validado por el esquema unificado (≥8 chars)
    if (typeof password !== 'string') {
      return res.status(400).json({ error: 'Debe proporcionar una contraseña para los usuarios generados.' });
    }
    const passErr = Validators.password(password);
    if (passErr !== true) {
      return res.status(400).json({ error: passErr });
    }
    // Rechazar la contraseña default conocida
    if (password === '123456') {
      return res.status(400).json({ error: 'La contraseña proporcionada es demasiado débil (default histórica).' });
    }

    const stmtRole = db.prepare("SELECT id FROM roles WHERE name = 'usr'");
    stmtRole.step();
    const roleUsrId = stmtRole.getAsObject().id;
    stmtRole.free();

    const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);

    db.run('BEGIN TRANSACTION');

    let inserted = 0;
    const usedNames = new Set();
    while (inserted < limit) {
      const suffix = Math.random().toString(36).substring(2, 7);
      const username = `User_${suffix}`;
      if (usedNames.has(username)) continue;
      usedNames.add(username);
      try {
        db.run(
          'INSERT INTO users (username, password, is_active, group_id, token_version) VALUES (?, ?, 1, NULL, 1)',
          [username, hashedPassword]
        );
        const resId = db.exec('SELECT last_insert_rowid() as id');
        const userId = resId[0].values[0][0];
        db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleUsrId]);
        inserted++;
      } catch (e) {
        // duplicado, retry
        continue;
      }
    }

    db.run('COMMIT');
    saveDB();

    audit(req.userId, 'user.seed_generated', null, { count: inserted, ip: req.ip });

    res.json({ success: true, message: `${inserted} usuarios generados.` });
  } catch (err) {
    try {
      db.run('ROLLBACK');
    } catch (rollbackErr) {
      /* noop */
    }
    safeError(res, err);
  }
});

// ============================================
// GROUPS
// ============================================

// GET /api/groups — filtrado por scope para no-admins
app.get('/api/groups', apiLimiter, verifyToken, (req, res) => {
  try {
    const isSa = req.userRoles.includes('Sa');
    const isAdm = req.userRoles.includes('adm');

    let query = `
      SELECT g.*, p.name as parent_name,
      (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id) as member_count,
      l.username as leader_name
      FROM groups g
      LEFT JOIN groups p ON g.parent_id = p.id
      LEFT JOIN users l ON g.leader_id = l.id
    `;
    const params = [];

    if (!isSa) {
      const requesterGroupId = getRequesterGroup(req.userId);
      if (isAdm && requesterGroupId) {
        // Admin regular: ve su grupo + sub-árbol
        query += `
          WHERE g.id = ?
          OR g.id IN (
            WITH RECURSIVE sub(id) AS (
              SELECT id FROM groups WHERE id = ?
              UNION ALL
              SELECT g2.id FROM groups g2 JOIN sub ON g2.parent_id = sub.id
            )
            SELECT id FROM sub
          )
        `;
        params.push(requesterGroupId, requesterGroupId);
      } else if (isAdm) {
        // Admin sin grupo: solo grupos raíz
        query += ' WHERE g.parent_id IS NULL';
      } else {
        // Usuario normal: solo su grupo
        if (requesterGroupId) {
          query += ' WHERE g.id = ?';
          params.push(requesterGroupId);
        } else {
          return res.json([]);
        }
      }
    }

    const stmt = db.prepare(query);
    stmt.bind(params);

    const groups = [];
    while (stmt.step()) groups.push(stmt.getAsObject());
    stmt.free();
    res.json(groups);
  } catch (err) {
    safeError(res, err);
  }
});

app.post('/api/groups', apiLimiter, verifyToken, verifyAdmin, (req, res) => {
  try {
    const { name, description, parent_id } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Nombre demasiado largo (máx 100 caracteres).' });
    }
    if (description && String(description).length > 500) {
      return res.status(400).json({ error: 'Descripción demasiado larga (máx 500 caracteres).' });
    }

    let parentIdInt = null;
    if (parent_id !== null && parent_id !== undefined && parent_id !== '') {
      parentIdInt = parsePositiveInt(parent_id, 'parent_id');
      const depth = getGroupDepth(parentIdInt);
      if (depth > MAX_GROUP_DEPTH) {
        return res.status(400).json({ error: `La profundidad máxima de grupos es ${MAX_GROUP_DEPTH}.` });
      }
      const parentCheck = db.prepare('SELECT 1 FROM groups WHERE id = ?');
      parentCheck.bind([parentIdInt]);
      if (!parentCheck.step()) {
        parentCheck.free();
        return res.status(400).json({ error: 'El grupo padre no existe.' });
      }
      parentCheck.free();
    }

    db.run('INSERT INTO groups (name, description, parent_id) VALUES (?, ?, ?)', [
      String(name).trim(),
      description ? String(description).trim() : null,
      parentIdInt,
    ]);
    const newId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    saveDB();
    audit(req.userId, 'group.created', newId, { name: String(name).trim(), parent_id: parentIdInt });
    res.json({ success: true, id: newId });
  } catch (err) {
    safeError(res, err);
  }
});

app.put('/api/groups/:id', apiLimiter, verifyToken, verifyAdmin, (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id, 'id');
    const { name, description, parent_id, leader_id } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Nombre inválido.' });
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'Nombre demasiado largo.' });
      }
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      if (description !== null && String(description).length > 500) {
        return res.status(400).json({ error: 'Descripción demasiado larga.' });
      }
      updates.push('description = ?');
      values.push(description ? String(description).trim() : null);
    }
    if (parent_id !== undefined) {
      let parentIdInt = null;
      if (parent_id !== null && parent_id !== '') {
        parentIdInt = parsePositiveInt(parent_id, 'parent_id');
        if (parentIdInt === id) {
          return res.status(400).json({ error: 'Un grupo no puede ser su propio padre.' });
        }
        const depth = getGroupDepth(parentIdInt);
        if (depth > MAX_GROUP_DEPTH) {
          return res.status(400).json({ error: `La profundidad máxima de grupos es ${MAX_GROUP_DEPTH}.` });
        }
      }
      updates.push('parent_id = ?');
      values.push(parentIdInt);
    }
    if (leader_id !== undefined) {
      let leaderIdInt = null;
      if (leader_id !== null && leader_id !== '') {
        leaderIdInt = parsePositiveInt(leader_id, 'leader_id');
        // Verificar que el user existe
        const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
        userStmt.bind([leaderIdInt]);
        if (!userStmt.step()) {
          userStmt.free();
          return res.status(400).json({ error: 'El usuario líder no existe.' });
        }
        userStmt.free();
      }
      updates.push('leader_id = ?');
      values.push(leaderIdInt);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar.' });
    }

    values.push(id);
    db.run(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDB();
    audit(req.userId, 'group.updated', id, { changed_fields: updates.map((u) => u.split(' = ')[0]) });
    res.json({ success: true });
  } catch (err) {
    safeError(res, err);
  }
});

app.delete('/api/groups/:id', apiLimiter, verifyToken, verifyAdmin, (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id, 'id');

    const existsStmt = db.prepare('SELECT id FROM groups WHERE id = ?');
    existsStmt.bind([id]);
    if (!existsStmt.step()) {
      existsStmt.free();
      return res.status(404).json({ error: 'Grupo no encontrado.' });
    }
    existsStmt.free();

    db.run('UPDATE groups SET parent_id = NULL WHERE parent_id = ?', [id]);
    db.run('UPDATE users SET group_id = NULL WHERE group_id = ?', [id]);
    db.run('UPDATE users SET token_version = token_version + 1 WHERE group_id = ?', [id]);
    db.run('DELETE FROM groups WHERE id = ?', [id]);

    saveDB();
    audit(req.userId, 'group.deleted', id, {});
    res.json({ success: true });
  } catch (err) {
    safeError(res, err);
  }
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Body-parser errors
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido en el cuerpo de la petición.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Cuerpo de la petición demasiado grande.' });
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = status < 500 && err.message ? err.message : 'Error interno del servidor';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ error: message });
});

// ============================================
// HEALTH (sin auth, para k8s/load balancer) — antes del 404 catch-all
// ============================================
app.get('/health', (_req, res) => {
  try {
    const stmt = db.prepare('SELECT 1 as ok');
    stmt.step();
    stmt.free();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      db: 'ok',
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'fail', error: err.message });
  }
});

app.get('/ready', (_req, res) => {
  if (!db) return res.status(503).json({ ready: false });
  res.json({ ready: true });
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ============================================
// START + GRACEFUL SHUTDOWN
// ============================================
let activeServer = null;

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[shutdown] Señal ${signal} recibida. Cerrando gracefully...`);

  if (!activeServer) {
    process.exit(0);
  }

  // 1. Dejar de aceptar conexiones nuevas
  activeServer.close((err) => {
    if (err) console.error('[shutdown] Error cerrando HTTP server:', err);

    // 2. Persistir BD
    try {
      saveDB();
      console.log('[shutdown] BD persistida.');
    } catch (e) {
      console.error('[shutdown] Error guardando BD:', e);
    }

    // 3. Cerrar sql.js
    try {
      db?.close();
    } catch (e) {
      /* noop */
    }

    console.log('[shutdown] Listo. Bye.');
    process.exit(err ? 1 : 0);
  });

  // Force-exit si tarda demasiado (10s)
  setTimeout(() => {
    console.error('[shutdown] Timeout. Forzando exit.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// ============================================
// EXPORTS + START GATE
// ============================================
export { app };

// Sólo auto-arrancar cuando se ejecuta directamente: node server/index.js
// (Permite importar `app` desde tests sin levantar el puerto.)
import { pathToFileURL } from 'node:url';
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

export function startServer() {
  if (activeServer) return activeServer;
  activeServer = app.listen(PORT, HOST, () => {
    console.log(`📡 Server: http://${HOST}:${PORT}`);
    console.log(`🔒 JWT_SECRET: ${SECRET_KEY.length >= 32 ? 'OK' : 'INSEGURO'} (${SECRET_KEY.length} chars)`);
    console.log(`🔑 bcrypt rounds: ${BCRYPT_ROUNDS}`);
    console.log(`🌐 CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`📝 Registro público: ${ALLOW_PUBLIC_REGISTER ? 'HABILITADO' : 'DESHABILITADO'}`);
  });
  return activeServer;
}

if (isDirectRun) {
  startServer();
}