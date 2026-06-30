import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE = './server/database.sqlite';

async function checkDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    const db = new SQL.Database(filebuffer);
    
    console.log("--- USUARIOS ---");
    const stmt = db.prepare("SELECT * FROM users");
    while(stmt.step()) {
      console.log(JSON.stringify(stmt.getAsObject()));
    }
    stmt.free();

    console.log("\n--- ROLES ---");
    const stmtRoles = db.prepare("SELECT * FROM roles");
    while(stmtRoles.step()) {
      console.log(JSON.stringify(stmtRoles.getAsObject()));
    }
    stmtRoles.free();

    console.log("\n--- USER_ROLES ---");
    const stmtUR = db.prepare("SELECT * FROM user_roles");
    while(stmtUR.step()) {
      console.log(JSON.stringify(stmtUR.getAsObject()));
    }
    stmtUR.free();

  } else {
    console.log("No DB file found");
  }
}

checkDB();
