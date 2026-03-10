const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { app: electronApp } = require('electron');

const app = express();

app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname, 'interface/dist')));

// Determine writable database path based on environment
let dbPath;
if (electronApp && typeof electronApp.getPath === 'function') {
    dbPath = path.join(electronApp.getPath('userData'), 'database.db');
    // Ensure the db exists at the writable location
    if (!fs.existsSync(dbPath)) {
        const packagedDbPath = path.join(__dirname, 'database.db');
        if (fs.existsSync(packagedDbPath)) {
            try {
                // Buffer copy is safer for ASAR
                fs.writeFileSync(dbPath, fs.readFileSync(packagedDbPath));
            } catch(e) {
                console.error("Failed to copy database:", e);
                // Fallback explicitly to local if fails (though it might still be read-only in ASAR)
                dbPath = packagedDbPath;
            }
        }
    }
} else {
    dbPath = path.join(__dirname, 'database.db');
}

const db = new Database(dbPath, { verbose: console.log });

app.get('/api/items', (req, res) => {
    try {
        const items = db.prepare('SELECT * FROM items').all();
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/items', (req, res) => {
    const { description, series_model, quantity, fixed_notes } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO items (description, series_model, quantity, fixed_notes) VALUES (?, ?, ?, ?)');
        const info = stmt.run(description, series_model || '', quantity || 1, fixed_notes || '');
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users').all();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para crear usuarios (Solo Admin en teoría)
app.post('/api/users', async (req, res) => {
    const { id, full_name, pin, role } = req.body;
    try {
        const hashedPin = await bcrypt.hash(pin, 10);
        let stmt;
        let info;
        if (id && id.toString().trim() !== "") {
            // Si mandan ID manual (Código de estudiante)
            stmt = db.prepare('INSERT INTO users (id, full_name, pin, role) VALUES (?, ?, ?, ?)');
            info = stmt.run(id, full_name, hashedPin, role || 'Servicio');
        } else {
            // Si nos piden que sea autoincremental
            stmt = db.prepare('INSERT INTO users (full_name, pin, role) VALUES (?, ?, ?)');
            info = stmt.run(full_name, hashedPin, role || 'Servicio');
        }
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error('Error adding user:', error);
        // Capturamos el error de SQLite de UNIQUE constraint por si el código ya existe
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            res.status(400).json({ success: false, message: 'Este Código de Estudiante ya está registrado.' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Endpoint para hacer login
app.post('/api/login', async (req, res) => {
    const { codigo, pin } = req.body;
    try {
        // En tu DB, permitiremos buscar tanto por ID numérico como por nombre (full_name).
        // Así puedes hacer login poniendo '1' o poniendo 'Admin'.
        const user = db.prepare('SELECT id, full_name, pin, role FROM users WHERE id = ? OR full_name = ?').get(codigo, codigo);

        if (user) {
            const isHashed = user.pin.startsWith('$2');
            let isMatch = false;

            if (isHashed) {
                isMatch = await bcrypt.compare(pin, user.pin);
            } else {
                isMatch = pin === user.pin;
                // Migrate to hashed password transparently
                if (isMatch) {
                    const hashedPin = await bcrypt.hash(pin, 10);
                    db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashedPin, user.id);
                }
            }

            if (isMatch) {
                delete user.pin;
                res.json({ success: true, user });
            } else {
                res.status(401).json({ success: false, message: 'Usuario o PIN incorrecto' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Usuario o PIN incorrecto' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports', (req, res) => {
    try {
        const reports = db.prepare('SELECT * FROM reports').all();
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo reporte y regresar el Folio
app.post('/api/reports', (req, res) => {
    const { id_user, items } = req.body;
    try {
        const stmtReport = db.prepare('INSERT INTO reports (id_user) VALUES (?)');
        const infoReport = stmtReport.run(id_user);
        const reportId = infoReport.lastInsertRowid;

        const stmtDetail = db.prepare('INSERT INTO details (id_report, id_item, is_present, status, comments) VALUES (?, ?, ?, ?, ?)');

        const insertMany = db.transaction((itemsToInsert) => {
            for (const item of itemsToInsert) {
                stmtDetail.run(reportId, item.id_item, item.is_present ? 1 : 0, item.status || 'Disponible', item.comments || '');
            }
        });

        if (items && items.length > 0) {
            insertMany(items);
        }

        res.json({ success: true, folio: reportId });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports-full', (req, res) => {
    try {
        const reports = db.prepare(`
            SELECT r.id, r.date_time, u.full_name 
            FROM reports r 
            LEFT JOIN users u ON r.id_user = u.id 
            ORDER BY r.date_time DESC
        `).all();
        res.json(reports);
    } catch (error) {
        console.error('Error fetching full reports:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/user/:id_user', (req, res) => {
    try {
        const reports = db.prepare(`
            SELECT r.id, r.date_time, u.full_name 
            FROM reports r 
            LEFT JOIN users u ON r.id_user = u.id 
            WHERE r.id_user = ?
            ORDER BY r.date_time DESC
        `).all(req.params.id_user);
        res.json(reports);
    } catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/:id/details', (req, res) => {
    try {
        const details = db.prepare(`
            SELECT d.*, i.description, i.series_model 
            FROM details d
            JOIN items i ON d.id_item = i.id
            WHERE d.id_report = ?
        `).all(req.params.id);
        res.json(details);
    } catch (error) {
        console.error('Error fetching report details:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/details', (req, res) => {
    try {
        const details = db.prepare('SELECT * FROM details').all();
        res.json(details);
    } catch (error) {
        console.error('Error fetching details:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fallback for React Router (if needed, though normally we only use API and default index)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'interface', 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});