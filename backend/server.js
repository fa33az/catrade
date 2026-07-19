const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = "super_secret_key_catrade_6767";

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
  db.serialize(() => {
    // 1. Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    // 2. Create trades table
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
        notes TEXT,
        user_id INTEGER REFERENCES users(id)
      )
    `, () => {
      // Migrate column user_id if not present
      db.all("PRAGMA table_info(trades)", [], (err, columns) => {
        if (!err && columns) {
          const hasUserId = columns.some(col => col.name === 'user_id');
          if (!hasUserId) {
            console.log("Migrating database: adding user_id to trades table...");
            db.run("ALTER TABLE trades ADD COLUMN user_id INTEGER REFERENCES users(id)", () => {
              seedDefaultUser();
            });
          } else {
            seedDefaultUser();
          }
        }
      });
    });
  });
}

function seedDefaultUser() {
  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (!err && row && row.count === 0) {
      const defaultPwd = crypto.createHash('sha256').update('admin').digest('hex');
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["admin", defaultPwd], function(err) {
        if (!err) {
          console.log("Default 'admin' user created with password 'admin'.");
          // Bind existing trades to user 1
          db.run("UPDATE trades SET user_id = 1 WHERE user_id IS NULL");
        }
      });
    } else {
      // In case there are null user_ids, fill them with 1
      db.run("UPDATE trades SET user_id = 1 WHERE user_id IS NULL");
    }
  });
}

// Token helper methods
function generateToken(userId, username) {
  const payload = `${userId}.${username}`;
  const sig = crypto.createHash('sha256').update(`${payload}.${SECRET_KEY}`).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [userId, username, sig] = parts;
    const payload = `${userId}.${username}`;
    const expectedSig = crypto.createHash('sha256').update(`${payload}.${SECRET_KEY}`).digest('hex');
    if (sig === expectedSig) {
      return { userId: parseInt(userId), username };
    }
  } catch (err) {
    // Ignore error
  }
  return null;
}

// Middleware for authentication
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  }
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Sesi kedaluwarsa atau tidak sah. Silakan login kembali.' });
  }
  req.user = user;
  next();
}

// API Routes

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();
  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ error: 'Username dan password tidak boleh kosong.' });
  }

  // Check if username exists
  db.get("SELECT id FROM users WHERE username = ?", [cleanUsername], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(400).json({ error: 'Username sudah terdaftar.' });
    }

    const passwordHash = crypto.createHash('sha256').update(cleanPassword).digest('hex');
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [cleanUsername, passwordHash], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'Registrasi berhasil!' });
    });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  const passwordHash = crypto.createHash('sha256').update(cleanPassword).digest('hex');
  db.get("SELECT id, username, password FROM users WHERE username = ?", [cleanUsername], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user || user.password !== passwordHash) {
      return res.status(400).json({ error: 'Username atau password salah.' });
    }

    const token = generateToken(user.id, user.username);
    res.json({
      token,
      username: user.username,
      user_id: user.id
    });
  });
});

// Get all trades
app.get('/api/trades', authenticate, (req, res) => {
  db.all('SELECT * FROM trades WHERE user_id = ? ORDER BY date DESC, id DESC', [req.user.userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Add a trade
app.post('/api/trades', authenticate, (req, res) => {
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
    INSERT INTO trades (date, pair, type, lot_size, entry_price, tp, sl, exit_price, pips, profit, status, notes, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    date,
    pair,
    type,
    parseFloat(lot_size),
    parseFloat(entry_price),
    tp ? parseFloat(tp) : null,
    sl ? parseFloat(sl) : null,
    exit_price ? parseFloat(exit_price) : null,
    pips ? parseFloat(pips) : null,
    profit ? parseFloat(profit) : null,
    status,
    notes || null,
    req.user.userId
  ];

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, ...req.body, user_id: req.user.userId });
  });
});

// Update a trade
app.put('/api/trades/:id', authenticate, (req, res) => {
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
    WHERE id = ? AND user_id = ?
  `;
  const params = [
    date,
    pair,
    type,
    parseFloat(lot_size),
    parseFloat(entry_price),
    tp ? parseFloat(tp) : null,
    sl ? parseFloat(sl) : null,
    exit_price ? parseFloat(exit_price) : null,
    pips ? parseFloat(pips) : null,
    profit ? parseFloat(profit) : null,
    status,
    notes || null,
    id,
    req.user.userId
  ];

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trade not found or unauthorized' });
    }
    res.json({ id: Number(id), ...req.body, user_id: req.user.userId });
  });
});

// Delete a trade
app.delete('/api/trades/:id', authenticate, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM trades WHERE id = ? AND user_id = ?', [id, req.user.userId], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trade not found or unauthorized' });
    }
    res.json({ message: 'Trade deleted successfully', id: Number(id) });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
