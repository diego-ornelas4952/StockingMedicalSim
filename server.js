const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();

app.use(cors());
app.use(express.json());

const db = new Database('database.db', { verbose: console.log });

app.get('/api/items', (req, res) => {
    try {
        const items = db.prepare('SELECT * FROM items').all();
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
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

app.get('/api/reports', (req, res) => {
    try {
        const reports = db.prepare('SELECT * FROM reports').all();
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});