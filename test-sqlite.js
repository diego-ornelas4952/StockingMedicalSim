const Database = require('better-sqlite3');
const db = new Database('database.db', { verbose: console.log });
const stmt = db.prepare('INSERT INTO users (id, full_name, pin, role) VALUES (?, ?, ?, ?)');
const info = stmt.run('219123456', 'Test Code', '1234', 'Servicio');
console.log(info);
