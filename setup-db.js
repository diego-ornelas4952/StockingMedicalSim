const Database = require('better-sqlite3');
const db = new Database('database.db', { verbose: console.log });

db.exec(`
  -- Table for the students and admins
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT DEFAULT 'Servicio'
  );

  -- Table for the stock 
  CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      series_model TEXT,
      quantity INTEGER DEFAULT 1,
      fixed_notes TEXT
  );

  -- Table that records each time someone does a checklist
  CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_user INTEGER,
      FOREIGN KEY(id_user) REFERENCES users(id)
  );

  -- Table that saves the Yes-No and Comments of each equipment in a specific report
  CREATE TABLE IF NOT EXISTS details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_report INTEGER,
      id_item INTEGER,
      is_present INTEGER,
      comments TEXT,
      FOREIGN KEY(id_report) REFERENCES reports(id),
      FOREIGN KEY(id_item) REFERENCES items(id)
  );
`);

console.log("Database created successfully");