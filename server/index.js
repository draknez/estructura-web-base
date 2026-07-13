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
const DB_FILE = path.join(__dirname, 'database.sqlite');

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
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' },
});

// Status público: presupuesto generoso porque HomePage hace polling cada 5s
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas de estado. Reduzca la frecuencia.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas ejecuciones del generador de usuarios. Espere 1 hora.' },
});

// ============================================
// DB INIT
// ============================================
let db;
const onlineUsers = new Set();

async function initDB() {
  const SQL = await initSqlJs();
  let needsSave = false;

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
    db.run('PRAGMA foreign_keys = ON;');
    console.log('✅ Base de datos cargada');
  } else {
    db = new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');
    console.log('⚠️ Nueva base de datos creada');

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      token_version INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER,
      leader_id INTEGER,
      FOREIGN KEY(parent_id) REFERENCES groups(id) ON DELETE SET NULL
    )`);

    try {
      db.run("INSERT INTO roles (name) VALUES ('usr')");
      db.run("INSERT INTO roles (name) VALUES ('adm')");
      db.run("INSERT INTO roles (name) VALUES ('Sa')");
    } catch (e) {
      /* ya existen */
    }
    needsSave = true;
  }

  // --- MIGRACIONES idempotentes ---

  // token_version
  try {
    db.exec('SELECT token_version FROM users LIMIT 1');
  } catch (e) {
    console.log("MIGRACIÓN: Añadiendo columna 'token_version'...");
    try {
      db.run('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1');
      needsSave = true;
    } catch (err) {
      console.error('Error migración token_version:', err);
    }
  }

  // is_active
  try {
    db.exec('SELECT is_active FROM users LIMIT 1');
  } catch (e) {
    console.log("MIGRACIÓN: Añadiendo columna 'is_active'...");
    try {
      db.run('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
      needsSave = true;
    } catch (alterErr) {
      console.error('Error migración is_active:', alterErr);
    }
  }

  // group_id
  try {
    db.exec('SELECT group_id FROM users LIMIT 1');
  } catch (e) {
    console.log("MIGRACIÓN: Añadiendo columna 'group_id'...");
    try {
      db.run('ALTER TABLE users ADD COLUMN group_id INTEGER');
      needsSave = true;
    } catch (alterErr) {
      console.error('Error migración group_id:', alterErr);
    }
  }

  // groups leader_id
  try {
    db.exec('SELECT leader_id FROM groups LIMIT 1');
  } catch (e) {
    console.log("MIGRACIÓN: Añadiendo columna 'leader_id' a grupos...");
    try {
      db.run('ALTER TABLE groups ADD COLUMN leader_id INTEGER');
      needsSave = true;
    } catch (alterErr) {
      console.error('Error migración leader_id:', alterErr);
    }
  }

  if (needsSave) saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

initDB();

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
      'SELECT id, username, password, is_active, token_version FROM users WHERE username = :username'
    );
    const user = stmt.getAsObject({ ':username': username });
    stmt.free();

    if (!user || !user.id) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Clave incorrecta' });
    }
    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    const roles = getRolesForUser(user.id);
    const token = jwt.sign(
      { id: user.id, username: user.username, roles, tv: user.token_version },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    onlineUsers.add(user.username);
    setTokenCookie(res, token);

    res.json({ user: { id: user.id, username: user.username, roles } });
  } catch (err) {
    console.error('Login Error:', err);
    return safeError(res, err, 'Error interno del servidor');
  }
});

// LOGOUT — ahora requiere auth y usa req.username
app.post('/api/logout', verifyToken, (req, res) => {
  onlineUsers.delete(req.username);
  clearTokenCookie(res);
  res.json({ success: true });
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
    res.json({ success: true });
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
    saveDB();
    res.json({ success: true });
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

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ============================================
// START
// ============================================
app.listen(PORT, HOST, () => {
  console.log(`📡 Server: http://${HOST}:${PORT}`);
  console.log(`🔒 JWT_SECRET: ${SECRET_KEY.length >= 32 ? 'OK' : 'INSEGURO'} (${SECRET_KEY.length} chars)`);
  console.log(`🔑 bcrypt rounds: ${BCRYPT_ROUNDS}`);
  console.log(`🌐 CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`📝 Registro público: ${ALLOW_PUBLIC_REGISTER ? 'HABILITADO' : 'DESHABILITADO'}`);
});