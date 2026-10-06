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

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
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

  // Migración: Crear tabla groups si no existe
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

  // Migración: Añadir leader_id a groups
  try {
    db.exec("SELECT leader_id FROM groups LIMIT 1");
  } catch (e) {
    console.log("MIGRACIÓN: Añadiendo columna 'leader_id' a grupos...");
    try {
      db.run("ALTER TABLE groups ADD COLUMN leader_id INTEGER");
      needsSave = true;
    } catch (alterErr) {
      console.error("Error migración leader_id:", alterErr);
    }
  }

  // Migración: Rol 'enc' si no existe
  try {
    const encExists = db.exec("SELECT id FROM roles WHERE name = 'enc'");
    if (!encExists.length || !encExists[0].values.length) {
      db.run("INSERT INTO roles (name) VALUES ('enc')");
      needsSave = true;
    }
  } catch(e) {}

  // Migración: Crear tabla posts si no existe
  try {
    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      cover_url TEXT,
      author_id INTEGER,
      status TEXT DEFAULT 'draft',
      content_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(author_id) REFERENCES users(id)
    )`);
    needsSave = true;
  } catch (e) {
    console.error("Error creando tabla posts:", e);
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

const verifyCanPublish = (req, res, next) => {
  const roles = req.userRoles || [];
  if (roles.includes('Sa') || roles.includes('adm') || roles.includes('enc')) {
    return next();
  }
  return res.status(403).json({ error: 'Permisos insuficientes para gestionar contenido' });
};

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || `post-${Date.now()}`;
}

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

// ADMIN: Obtener todos los usuarios con detalle (Filtrado por Grupo)
app.get('/api/admin/users', verifyToken, verifyAdmin, (req, res) => {
  try {
    const isSuperAdmin = req.userRoles && req.userRoles.includes('Sa');
    let query = `
      SELECT u.id, u.username, u.is_active, u.group_id, g.name as group_name 
      FROM users u
      LEFT JOIN groups g ON u.group_id = g.id
    `;
    
    const params = [];

    // Si NO es SuperAdmin, filtrar por su propio grupo
    if (!isSuperAdmin) {
      const requesterStmt = db.prepare("SELECT group_id FROM users WHERE id = ?");
      requesterStmt.bind([req.userId]);
      if (requesterStmt.step()) {
        const requesterGroupId = requesterStmt.getAsObject().group_id;
        requesterStmt.free();

        if (requesterGroupId) {
          query += " WHERE u.group_id = ?";
          params.push(requesterGroupId);
        } else {
          // Si el Admin no tiene grupo, ¿qué ve? Por seguridad, nada (o solo a sí mismo, pero la UI lo filtra).
          // Asumiremos que ve usuarios sin grupo O nada. Cumpliendo "solo a los de su grupo":
          query += " WHERE u.group_id IS NULL"; 
        }
      } else {
        requesterStmt.free();
        return res.status(403).json({ error: 'Usuario no encontrado' });
      }
    }

    const stmt = db.prepare(query);
    stmt.bind(params);
    
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
  const isSuperAdmin = req.userRoles && req.userRoles.includes('Sa');
  
  if (parseInt(targetUserId) === req.userId) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
  }

  try {
    if (!isSuperAdmin) {
       // Obtener grupo del requester
       const reqStmt = db.prepare("SELECT group_id FROM users WHERE id = ?");
       reqStmt.bind([req.userId]);
       reqStmt.step();
       const reqGroup = reqStmt.getAsObject().group_id;
       reqStmt.free();

       // Obtener grupo del target
       const targetStmt = db.prepare("SELECT group_id FROM users WHERE id = ?");
       targetStmt.bind([targetUserId]);
       targetStmt.step();
       const targetGroup = targetStmt.getAsObject().group_id;
       targetStmt.free();
       
       if (reqGroup !== targetGroup) {
         return res.status(403).json({ error: 'Solo puedes gestionar usuarios de tu mismo grupo.' });
       }
    }

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

// ADMIN: Editar Usuario (Asignar Grupo, Nombre, Clave)
app.put('/api/admin/user/:id', verifyToken, verifyAdmin, (req, res) => {
  const targetId = req.params.id;
  const { group_id, username, password } = req.body;
  const isSuperAdmin = req.userRoles && req.userRoles.includes('Sa');

  try {
    // VERIFICACIÓN DE PERMISOS (Scope)
    if (!isSuperAdmin) {
      // 1. Obtener datos del requester y del target
      const requesterStmt = db.prepare("SELECT group_id FROM users WHERE id = ?");
      requesterStmt.bind([req.userId]);
      requesterStmt.step();
      const requesterGroupId = requesterStmt.getAsObject().group_id;
      requesterStmt.free();

      const targetStmt = db.prepare("SELECT group_id FROM users WHERE id = ?");
      targetStmt.bind([targetId]);
      targetStmt.step();
      const targetGroupId = targetStmt.getAsObject().group_id;
      targetStmt.free();

      // 2. Verificar si es LÍDER del grupo del objetivo
      let isLeaderOfTarget = false;
      if (targetGroupId) {
        const leaderStmt = db.prepare("SELECT leader_id FROM groups WHERE id = ?");
        leaderStmt.bind([targetGroupId]);
        if (leaderStmt.step()) {
           const leaderId = leaderStmt.getAsObject().leader_id;
           if (leaderId === req.userId) isLeaderOfTarget = true;
        }
        leaderStmt.free();
      }

      // REGLA: Solo puede editar si está en el mismo grupo O es el líder de ese grupo
      if (requesterGroupId !== targetGroupId && !isLeaderOfTarget) {
        return res.status(403).json({ error: 'No tienes permiso para editar usuarios fuera de tu grupo.' });
      }
    }

    const updates = [];
    const values = [];

    // 1. Validar Grupo
    if (group_id !== undefined) {
      if (group_id !== "" && group_id !== null) {
        const groupStmt = db.prepare("SELECT id FROM groups WHERE id = ?");
        groupStmt.bind([group_id]);
        if (!groupStmt.step()) {
          groupStmt.free();
          return res.status(400).json({ error: 'El grupo especificado no existe.' });
        }
        groupStmt.free();
      }
      updates.push("group_id = ?");
      values.push(group_id === "" ? null : group_id);
    }

    // 2. Validar Username
    if (username) {
      // Verificar duplicados (excluyendo el propio usuario)
      const checkStmt = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?");
      checkStmt.bind([username, targetId]);
      if (checkStmt.step()) {
        checkStmt.free();
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
      }
      checkStmt.free();
      updates.push("username = ?");
      values.push(username);
    }

    // 3. Validar Password
    if (password && password.trim() !== "") {
      const hashedPassword = bcrypt.hashSync(password, 8);
      updates.push("password = ?");
      values.push(hashedPassword);
    }

    if (updates.length > 0) {
        values.push(targetId);
        const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
        db.run(query, values);
    }

    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Crear Usuario Manualmente
app.post('/api/admin/users', verifyToken, verifyAdmin, (req, res) => {
  const { username, password } = req.body;
  const isSuperAdmin = req.userRoles && req.userRoles.includes('Sa');

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña obligatorios.' });
  }

  try {
    // 1. Verificar duplicado
    const checkStmt = db.prepare("SELECT id FROM users WHERE username = ?");
    checkStmt.bind([username]);
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'El usuario ya existe.' });
    }
    checkStmt.free();

    // 2. Determinar grupo automático si NO es SuperAdmin
    let autoGroupId = null;
    if (!isSuperAdmin) {
       const requesterStmt = db.prepare("SELECT group_id FROM users WHERE id = ?");
       requesterStmt.bind([req.userId]);
       if (requesterStmt.step()) {
          const row = requesterStmt.getAsObject();
          if (row.group_id) {
            autoGroupId = row.group_id;
          }
       }
       requesterStmt.free();
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    // 3. Crear Usuario (Insertar con group_id si aplica)
    db.run('INSERT INTO users (username, password, is_active, group_id) VALUES (?, ?, 1, ?)', [username, hashedPassword, autoGroupId]);
    const resId = db.exec("SELECT last_insert_rowid() as id");
    const userId = resId[0].values[0][0];

    // 4. Asignar Roles
    // Rol 'usr' siempre
    const stmtRoleUsr = db.prepare("SELECT id FROM roles WHERE name = 'usr'");
    if (stmtRoleUsr.step()) {
        const roleUsrId = stmtRoleUsr.getAsObject().id;
        db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleUsrId]);
    }
    stmtRoleUsr.free();

    saveDB();
    res.json({ success: true, id: userId });

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

// SUPERADMIN: SEED (Generador Masivo de Usuarios)
app.post('/api/admin/seed-users', verifyToken, verifySuperAdmin, (req, res) => {
  const { count = 10, password = '123456' } = req.body;
  const limit = Math.min(count, 500); // Límite de seguridad por petición

  try {
    console.log(`🌱 Generando ${limit} usuarios...`);
    
    // 1. Hash de la contraseña (UNA SOLA VEZ para optimizar CPU)
    const hashedPassword = bcrypt.hashSync(password, 8);

    // 2. Obtener ID del rol 'usr'
    const stmtRole = db.prepare("SELECT id FROM roles WHERE name = 'usr'");
    stmtRole.step();
    const roleUsrId = stmtRole.getAsObject().id;
    stmtRole.free();

    // 3. Bucle de inserción
    db.run("BEGIN TRANSACTION"); // Optimización velocidad SQL
    
    for (let i = 0; i < limit; i++) {
      // Generar sufijo aleatorio 5 chars
      const suffix = Math.random().toString(36).substring(2, 7);
      const username = `User_${suffix}`;
      
      try {
        db.run('INSERT INTO users (username, password, is_active, group_id) VALUES (?, ?, 1, NULL)', [username, hashedPassword]);
        const resId = db.exec("SELECT last_insert_rowid() as id");
        const userId = resId[0].values[0][0];
        db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleUsrId]);
      } catch (e) {
        // Ignorar duplicados si la suerte falla
        continue;
      }
    }
    
    db.run("COMMIT");
    saveDB(); // Guardar a disco una sola vez al final

    res.json({ success: true, message: `${limit} usuarios generados.` });
  } catch (err) {
    db.run("ROLLBACK");
    res.status(500).json({ error: err.message });
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
      SELECT g.*, p.name as parent_name,
      (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id) as member_count,
      l.username as leader_name, l.id as leader_id_check
      FROM groups g 
      LEFT JOIN groups p ON g.parent_id = p.id
      LEFT JOIN users l ON g.leader_id = l.id
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

app.put('/api/groups/:id', verifyToken, verifyAdmin, (req, res) => {
  const id = req.params.id;
  const { name, description, parent_id, leader_id } = req.body;

  try {
    // Si se envía leader_id, verificamos que exista
    // Nota: Lógica simplificada, idealmente verificar profundidad si se cambia parent_id
    
    // Construir query dinámica
    const updates = [];
    const values = [];
    
    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (description !== undefined) { updates.push("description = ?"); values.push(description); }
    if (parent_id !== undefined) { updates.push("parent_id = ?"); values.push(parent_id || null); }
    if (leader_id !== undefined) { updates.push("leader_id = ?"); values.push(leader_id || null); }
    
    if (updates.length > 0) {
      values.push(id);
      db.run(`UPDATE groups SET ${updates.join(", ")} WHERE id = ?`, values);
      saveDB();
    }
    
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

// ==========================================
// --- CONTENT STUDIO & POSTS ENDPOINTS ---
// ==========================================

// Endpoint para subida de archivos (Imágenes, Videos, Audios, Documentos)
app.post('/api/upload', verifyToken, verifyCanPublish, (req, res) => {
  try {
    const { filename, data, type } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No se recibieron datos de archivo' });
    }

    const safeName = (filename || 'media')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const uniqueFilename = `${Date.now()}_${safeName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);

    let base64Clean = data;
    if (data.includes(';base64,')) {
      base64Clean = data.split(';base64,')[1];
    }

    const buffer = Buffer.from(base64Clean, 'base64');
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: uniqueFilename,
      originalName: filename,
      size: buffer.length,
      type: type || 'file'
    });
  } catch (err) {
    console.error('Error al subir archivo:', err);
    res.status(500).json({ error: 'Error al procesar la subida del archivo' });
  }
});

// Listar publicaciones
app.get('/api/posts', (req, res) => {
  try {
    const token = req.headers['x-access-token'];
    let canViewAll = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const roles = decoded.roles || [];
        if (roles.includes('Sa') || roles.includes('adm') || roles.includes('enc')) {
          canViewAll = true;
        }
      } catch (e) {}
    }

    let query = `
      SELECT p.id, p.slug, p.title, p.summary, p.cover_url, p.status, p.author_id, p.created_at, p.updated_at,
             u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
    `;

    if (!canViewAll) {
      query += ` WHERE p.status = 'published'`;
    }
    query += ` ORDER BY p.created_at DESC`;

    const stmt = db.prepare(query);
    const posts = [];
    while (stmt.step()) {
      posts.push(stmt.getAsObject());
    }

    res.json(posts);
  } catch (err) {
    console.error('Error listando posts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener una publicación por slug o ID
app.get('/api/posts/:slugOrId', (req, res) => {
  try {
    const param = req.params.slugOrId;
    const isId = /^\d+$/.test(param);

    const token = req.headers['x-access-token'];
    let canViewAll = false;
    if (token) {
      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const roles = decoded.roles || [];
        if (roles.includes('Sa') || roles.includes('adm') || roles.includes('enc')) {
          canViewAll = true;
        }
      } catch (e) {}
    }

    let query = `
      SELECT p.id, p.slug, p.title, p.summary, p.cover_url, p.status, p.content_json, p.author_id, p.created_at, p.updated_at,
             u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE ${isId ? 'p.id = ?' : 'p.slug = ?'}
    `;

    const stmt = db.prepare(query);
    stmt.bind([isId ? parseInt(param, 10) : param]);

    if (!stmt.step()) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const post = stmt.getAsObject();

    if (post.status !== 'published' && !canViewAll) {
      return res.status(403).json({ error: 'Esta publicación aún es un borrador no publicado' });
    }

    let blocks = [];
    try {
      blocks = JSON.parse(post.content_json);
    } catch (e) {
      blocks = [];
    }

    res.json({
      ...post,
      blocks
    });
  } catch (err) {
    console.error('Error obteniendo post:', err);
    res.status(500).json({ error: err.message });
  }
});

// Crear publicación
app.post('/api/posts', verifyToken, verifyCanPublish, (req, res) => {
  try {
    const { title, slug, summary, cover_url, status, blocks } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    let postSlug = slug ? slugify(slug) : slugify(title);

    const checkSlug = db.prepare("SELECT id FROM posts WHERE slug = ?");
    checkSlug.bind([postSlug]);
    if (checkSlug.step()) {
      postSlug = `${postSlug}-${Date.now().toString().slice(-4)}`;
    }

    const contentJson = JSON.stringify(blocks || []);
    const userRoles = req.userRoles || [];
    const canPublishDirect = userRoles.includes('Sa') || userRoles.includes('adm');
    const postStatus = canPublishDirect ? (status || 'draft') : 'draft';

    db.run(
      `INSERT INTO posts (slug, title, summary, cover_url, author_id, status, content_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [postSlug, title.trim(), summary || '', cover_url || '', req.userId, postStatus, contentJson]
    );

    saveDB();

    const lastIdRes = db.exec("SELECT last_insert_rowid() as id");
    const newId = lastIdRes[0].values[0][0];

    res.status(201).json({
      success: true,
      post: {
        id: newId,
        slug: postSlug,
        title,
        status: postStatus
      }
    });
  } catch (err) {
    console.error('Error creando post:', err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar publicación
app.put('/api/posts/:id', verifyToken, verifyCanPublish, (req, res) => {
  try {
    const id = req.params.id;
    const { title, slug, summary, cover_url, status, blocks } = req.body;

    const findStmt = db.prepare("SELECT * FROM posts WHERE id = ?");
    findStmt.bind([id]);
    if (!findStmt.step()) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }
    const current = findStmt.getAsObject();

    const userRoles = req.userRoles || [];
    const isAdmin = userRoles.includes('Sa') || userRoles.includes('adm');
    if (!isAdmin && current.author_id !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este post' });
    }

    let postSlug = slug ? slugify(slug) : current.slug;
    if (postSlug !== current.slug) {
      const checkSlug = db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?");
      checkSlug.bind([postSlug, id]);
      if (checkSlug.step()) {
        postSlug = `${postSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const contentJson = blocks !== undefined ? JSON.stringify(blocks) : current.content_json;
    const newStatus = isAdmin ? (status !== undefined ? status : current.status) : 'draft';

    db.run(
      `UPDATE posts 
       SET title = ?, slug = ?, summary = ?, cover_url = ?, status = ?, content_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title !== undefined ? title.trim() : current.title,
        postSlug,
        summary !== undefined ? summary : current.summary,
        cover_url !== undefined ? cover_url : current.cover_url,
        newStatus,
        contentJson,
        id
      ]
    );

    saveDB();
    res.json({ success: true, slug: postSlug });
  } catch (err) {
    console.error('Error actualizando post:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar publicación
app.delete('/api/posts/:id', verifyToken, verifyCanPublish, (req, res) => {
  try {
    const id = req.params.id;
    const findStmt = db.prepare("SELECT * FROM posts WHERE id = ?");
    findStmt.bind([id]);
    if (!findStmt.step()) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }
    const current = findStmt.getAsObject();

    const userRoles = req.userRoles || [];
    const isAdmin = userRoles.includes('Sa') || userRoles.includes('adm');
    if (!isAdmin && current.author_id !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este post' });
    }

    db.run("DELETE FROM posts WHERE id = ?", [id]);
    saveDB();

    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando post:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`📡 Server: http://localhost:${PORT}`));