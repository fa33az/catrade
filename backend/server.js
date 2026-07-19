const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      pair TEXT NOT NULL,
      type TEXT NOT NULL,
      lot_size REAL NOT NULL,
      entry_price REAL NOT NULL,
      tp REAL,
      sl REAL,
      exit_price REAL,
      pips REAL,
      profit REAL,
      status TEXT NOT NULL,
      notes TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create trades table:', err.message);
    } else {
      console.log('Trades table initialized successfully.');
    }
  });
}

// API Routes

// Get all trades
app.get('/api/trades', (req, res) => {
  db.all('SELECT * FROM trades ORDER BY date DESC, id DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a trade
app.post('/api/trades', (req, res) => {
  const {
    date,
    pair,
    type,
    lot_size,
    entry_price,
    tp,
    sl,
    exit_price,
    pips,
    profit,
    status,
    notes
  } = req.body;

  if (!date || !pair || !type || !lot_size || !entry_price || !status) {
    return res.status(400).json({ error: 'Missing required trade details' });
  }

  const query = `
    INSERT INTO trades (date, pair, type, lot_size, entry_price, tp, sl, exit_price, pips, profit, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [date, pair, type, lot_size, entry_price, tp, sl, exit_price, pips, profit, status, notes];

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});

// Update a trade
app.put('/api/trades/:id', (req, res) => {
  const { id } = req.params;
  const {
    date,
    pair,
    type,
    lot_size,
    entry_price,
    tp,
    sl,
    exit_price,
    pips,
    profit,
    status,
    notes
  } = req.body;

  const query = `
    UPDATE trades 
    SET date = ?, pair = ?, type = ?, lot_size = ?, entry_price = ?, tp = ?, sl = ?, exit_price = ?, pips = ?, profit = ?, status = ?, notes = ?
    WHERE id = ?
  `;
  const params = [date, pair, type, lot_size, entry_price, tp, sl, exit_price, pips, profit, status, notes, id];

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    res.json({ id: Number(id), ...req.body });
  });
});

// Delete a trade
app.delete('/api/trades/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM trades WHERE id = ?', id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    res.json({ message: 'Trade deleted successfully', id: Number(id) });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
