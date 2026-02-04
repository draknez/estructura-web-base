import express from 'express';
import initSqlJs from 'sql.js';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { Validators } from './validators.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'clave_fallback_insegura_no_usar';
const DB_FILE = path.join(__dirname, 'database.sqlite');

// Memoria volátil para usuarios online
const onlineUsers = new Set();

// --- SEGURIDAD: Rate Limiting ---
// Limitador general para toda la API (ej. 100 peticiones por 15 min)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' }
});

// Limitador estricto para Login/Register (Fuerza Bruta)
// Ej: 5 intentos cada 15 minutos
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Bloqueado por 15 minutos.' }
});

app.use(cors());
app.use(express.json());
// Aplicar limitador general a todas las rutas que empiecen por /api
app.use('/api', apiLimiter);

let db;

async function initDB() {
  const SQL = await initSqlJs();
  let needsSave = false;

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
    console.log('✅ Base de datos cargada');
  } else {
    db = new SQL.Database();
    console.log('⚠️ Nueva base de datos creada');
    
    // 1. Tabla Usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);

    // 2. Tabla Roles
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    )`);

    // 3. Tabla Pivote (User <-> Role)
    db.run(`CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER,
      role_id INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(role_id) REFERENCES roles(id)
    )`);

    // 4. Tabla Grupos (Jerárquica)
    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER,
      FOREIGN KEY(parent_id) REFERENCES groups(id)
    )`);

    // Insertar roles por defecto
    try {
      db.run("INSERT INTO roles (name) VALUES ('usr')");
      db.run("INSERT INTO roles (name) VALUES ('adm')");
      db.run("INSERT INTO roles (name) VALUES ('Sa')");
    } catch (e) {
      // Roles ya existen
    }
    needsSave = true;
  }

  // --- MIGRACIONES (Se ejecutan siempre para asegurar la estructura) ---
  
  // Migración: Columna is_active
  try {
    // Intentamos seleccionar la columna para ver si existe
    db.exec("SELECT is_active FROM users LIMIT 1");
  } catch (e) {
    // Si falla, es que no existe. La creamos.
    console.log("MIGRACIÓN: Añadiendo columna 'is_active'...");
    try {
      db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
      // Actualizar usuarios existentes que tengan NULL
      db.run("UPDATE users SET is_active = 1 WHERE is_active IS NULL");
      needsSave = true;
    } catch (alterErr) {
      console.error("Error en migración is_active:", alterErr);
    }
  }

  // Migración: Columna group_id en users
  try {
    db.exec("SELECT group_id FROM users LIMIT 1");
  } catch (e) {
    console.log("MIGRACIÓN: Añadiendo columna 'group_id'...");
    try {
      db.run("ALTER TABLE users ADD COLUMN group_id INTEGER");
      needsSave = true;
    } catch (alterErr) {
      console.error("Error en migración group_id:", alterErr);
    }
  }

  // Migración: Crear tabla groups si no existe (para bases de datos antiguas)
  try {
    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER,
      FOREIGN KEY(parent_id) REFERENCES groups(id)
    )`);
    needsSave = true;
  } catch (e) {
    console.error("Error creando tabla groups:", e);
  }

  if (needsSave) {
    saveDB();
  }
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

initDB();

// --- MIDDLEWARES ---

const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    req.userRoles = decoded.roles;
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

// --- ENDPOINTS ---

app.get('/api/users/status', (req, res) => {
  try {
    // Seleccionar usuarios activos QUE NO sean SuperAdmin (Sa)
    const query = `
      SELECT id, username 
      FROM users 
      WHERE is_active = 1 
      AND id NOT IN (
        SELECT ur.user_id 
        FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'Sa'
      )
    `;
    const stmt = db.prepare(query);
    const users = [];
    while(stmt.step()) {
      const row = stmt.getAsObject();
      users.push({
        ...row,
        online: onlineUsers.has(row.username)
      });
    }
    stmt.free();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Obtener todos los usuarios con detalle
app.get('/api/admin/users', verifyToken, verifyAdmin, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT u.id, u.username, u.is_active, u.group_id, g.name as group_name 
      FROM users u
      LEFT JOIN groups g ON u.group_id = g.id
    `);
    const users = [];
    while(stmt.step()) {
      const row = stmt.getAsObject();
      const roles = getRolesForUser(row.id);
      
      // OCULTAR SUPERADMINS: Si el usuario tiene rol 'Sa', no lo mostramos en la lista
      if (roles.includes('Sa')) continue;

      users.push({
        ...row,
        roles,
        online: onlineUsers.has(row.username),
        isAdmin: roles.includes('adm')
      });
    }
    stmt.free();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Alternar Rol Admin
app.post('/api/admin/toggle-role', verifyToken, verifyAdmin, (req, res) => {
  const { targetUserId, roleName } = req.body; // roleName: 'adm'
  
  try {
    const stmtRole = db.prepare("SELECT id FROM roles WHERE name = :name");
    const role = stmtRole.getAsObject({ ':name': roleName });
    stmtRole.free();

    if (!role.id) return res.status(400).json({ error: 'Rol no existe' });

    // Verificar si ya lo tiene
    const checkStmt = db.prepare("SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?");
    checkStmt.bind([targetUserId, role.id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      // Quitar rol
      db.run("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?", [targetUserId, role.id]);
    } else {
      // Poner rol
      db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [targetUserId, role.id]);
    }
    
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Alternar Estado (Ban/Unban)
app.post('/api/admin/toggle-status', verifyToken, verifyAdmin, (req, res) => {
  const { targetUserId } = req.body;
  
  if (parseInt(targetUserId) === req.userId) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
  }

  try {
    const stmt = db.prepare("SELECT is_active FROM users WHERE id = ?");
    stmt.bind([targetUserId]);
    stmt.step();
    const currentStatus = stmt.getAsObject().is_active;
    stmt.free();

    const newStatus = currentStatus === 1 ? 0 : 1;
    
    db.run("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, targetUserId]);
    saveDB();

    // Si se desactiva, forzar logout (sacarlo de la lista online)
    if (newStatus === 0) {
      const userStmt = db.prepare("SELECT username FROM users WHERE id = ?");
      userStmt.bind([targetUserId]);
      userStmt.step();
      const uName = userStmt.getAsObject().username;
      userStmt.free();
      if (uName) onlineUsers.delete(uName);
    }

    res.json({ success: true, newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Editar Usuario (Asignar Grupo, etc)
app.put('/api/admin/user/:id', verifyToken, verifyAdmin, (req, res) => {
  const targetId = req.params.id;
  const { group_id } = req.body;

  try {
    // Validar grupo si se envía
    if (group_id) {
      const groupStmt = db.prepare("SELECT id FROM groups WHERE id = ?");
      groupStmt.bind([group_id]);
      if (!groupStmt.step()) {
        groupStmt.free();
        return res.status(400).json({ error: 'El grupo especificado no existe.' });
      }
      groupStmt.free();
    }

    // Actualizar usuario
    // Nota: Si group_id es null/undefined, lo ponemos a NULL en la BD si se envía explícitamente null, 
    // o lo ignoramos si no se envía. Aquí asumiremos que se quiere actualizar.
    
    // Convertir '' a null para SQL
    const finalGroupId = group_id === "" ? null : group_id;

    db.run("UPDATE users SET group_id = ? WHERE id = ?", [finalGroupId, targetId]);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUPERADMIN: Eliminar usuario definitivamente
app.delete('/api/admin/user/:id', verifyToken, verifySuperAdmin, (req, res) => {
  const targetUserId = req.params.id;

  try {
    // 1. Eliminar relaciones de roles
    db.run("DELETE FROM user_roles WHERE user_id = ?", [targetUserId]);
    
    // 2. Eliminar usuario
    db.run("DELETE FROM users WHERE id = ?", [targetUserId]);
    
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUPERADMIN: RESET TOTAL DEL SISTEMA (Génesis)
app.post('/api/admin/system-reset', verifyToken, verifySuperAdmin, (req, res) => {
  try {
    console.warn(`⚠️ SYSTEM RESET INICIADO POR USUARIO ID ${req.userId}`);

    // 1. Vaciar tablas de usuarios y relaciones
    db.run("DELETE FROM user_roles"); // Borra asignaciones
    db.run("DELETE FROM users");      // Borra usuarios
    
    // 2. Reiniciar contadores de ID (opcional, para que el próximo sea ID 1)
    try {
      db.run("DELETE FROM sqlite_sequence WHERE name='users'");
    } catch(e) { /* Ignorar si no existe */ }

    // 3. Limpiar memoria
    onlineUsers.clear();
    
    saveDB();

    console.log("♻️ SISTEMA REINICIADO A MODO FÁBRICA");
    res.json({ success: true, message: "Sistema reiniciado correctamente." });
  } catch (err) {
    console.error("Error en System Reset:", err);
    res.status(500).json({ error: "Fallo crítico al reiniciar el sistema." });
  }
});

app.post('/api/register', authLimiter, (req, res) => {
  const { username, password } = req.body;

  // 1. Validación de Datos (Sin dependencias)
  const error = Validators.validate(req.body, {
    username: Validators.username,
    password: Validators.password
  });

  if (error) {
    return res.status(400).json({ error });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 8);
  
  try {
    // Verificar si es el PRIMER usuario del sistema
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM users");
    countStmt.step();
    const userCount = countStmt.getAsObject().count;
    countStmt.free();

    const isFirstUser = userCount === 0;

    // 1. Crear Usuario (is_active default 1)
    db.run('INSERT INTO users (username, password, is_active) VALUES (?, ?, 1)', [username, hashedPassword]);
    
    // Obtener ID del nuevo usuario
    const resId = db.exec("SELECT last_insert_rowid() as id");
    const userId = resId[0].values[0][0];

    // 2. Asignar Roles
    const rolesToAssign = ['usr']; // Todos son usuarios
    
    if (isFirstUser) {
      rolesToAssign.push('adm'); // Primer usuario es admin
      rolesToAssign.push('Sa');  // Primer usuario es SuperAdmin
    }

    // Insertar roles en la BD
    for (const roleName of rolesToAssign) {
      const stmtRole = db.prepare("SELECT id FROM roles WHERE name = :name");
      const roleRow = stmtRole.getAsObject({ ':name': roleName });
      stmtRole.free();
      
      if (roleRow.id) {
        db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleRow.id]);
      }
    }

    saveDB();

    // Obtener roles para devolverlos en el token
    const roles = getRolesForUser(userId);
    
    const token = jwt.sign({ id: userId, username, roles }, SECRET_KEY, { expiresIn: '24h' });
    onlineUsers.add(username);
    
    res.json({ token, user: { id: userId, username, roles } });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al registrar (¿Usuario duplicado?)' });
  }
});

app.post('/api/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  try {
    const stmt = db.prepare("SELECT * FROM users WHERE username=:username");
    const user = stmt.getAsObject({':username': username});
    stmt.free();
    
    if (!user || !user.id) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Clave incorrecta' });
    
    // Verificación de cuenta activa
    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    // Obtener roles reales desde la pivote
    const roles = getRolesForUser(user.id);

    const token = jwt.sign({ id: user.id, username: user.username, roles }, SECRET_KEY, { expiresIn: '24h' });
    onlineUsers.add(user.username);

    res.json({ token, user: { id: user.id, username: user.username, roles } });
  } catch (err) {
    console.error("Login Error:", err); // Log interno
    res.status(500).json({ error: 'Error interno del servidor' }); // Respuesta genérica
  }
});

app.post('/api/logout', (req, res) => {
  const { username } = req.body;
  if (username) {
    onlineUsers.delete(username);
  }
  res.json({ success: true });
});

// Helper para obtener roles
function getRolesForUser(userId) {
  const query = `
    SELECT r.name 
    FROM roles r 
    JOIN user_roles ur ON r.id = ur.role_id 
    WHERE ur.user_id = ?
  `;
  const stmt = db.prepare(query);
  stmt.bind([userId]);
  const roles = [];
  while(stmt.step()) {
    roles.push(stmt.getAsObject().name);
  }
  stmt.free();
  return roles;
}

// Helper: Calcular profundidad de un grupo
function getGroupDepth(parentId, currentDepth = 1) {
  if (!parentId) return currentDepth;
  if (currentDepth >= 5) return currentDepth; // Límite alcanzado

  const stmt = db.prepare("SELECT parent_id FROM groups WHERE id = ?");
  stmt.bind([parentId]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return getGroupDepth(row.parent_id, currentDepth + 1);
  }
  
  stmt.free();
  return currentDepth;
}

// --- GRUPOS ENDPOINTS ---

app.get('/api/groups', verifyToken, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT g.*, p.name as parent_name 
      FROM groups g 
      LEFT JOIN groups p ON g.parent_id = p.id
    `);
    const groups = [];
    while(stmt.step()) {
      groups.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', verifyToken, verifyAdmin, (req, res) => {
  const { name, description, parent_id } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  // Validar profundidad
  if (parent_id) {
    const depth = getGroupDepth(parent_id);
    if (depth >= 5) {
      return res.status(400).json({ error: 'La profundidad máxima de grupos es 5.' });
    }
  }

  try {
    db.run("INSERT INTO groups (name, description, parent_id) VALUES (?, ?, ?)", [name, description, parent_id]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:id', verifyToken, verifyAdmin, (req, res) => {
  const id = req.params.id;
  
  try {
    // 1. Promover subgrupos a Raíz (parent_id = NULL)
    db.run("UPDATE groups SET parent_id = NULL WHERE parent_id = ?", [id]);

    // 2. Liberar usuarios (group_id = NULL)
    db.run("UPDATE users SET group_id = NULL WHERE group_id = ?", [id]);

    // 3. Eliminar el grupo
    db.run("DELETE FROM groups WHERE id = ?", [id]);
    
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`📡 Server: http://localhost:${PORT}`));