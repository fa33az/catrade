const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = "super_secret_key_catrade_6767";

app.use(cors());
app.use(express.json());

// JSON File Database Setup
const dbFile = process.env.VERCEL
  ? path.join('/tmp', 'database.json')
  : path.join(__dirname, 'database.json');

// Ensure database file exists and is initialized
function initializeDatabase() {
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Dynamic migration from SQLite if it exists
  const oldDbPath = path.join(__dirname, 'database.db');
  if (fs.existsSync(oldDbPath) && !fs.existsSync(dbFile)) {
    console.log("Found old SQLite database. Attempting auto-migration to JSON...");
    try {
      const sqlite3 = require('sqlite3').verbose();
      const tempDb = new sqlite3.Database(oldDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (!err) {
          tempDb.all("SELECT * FROM users", [], (err, sqliteUsers) => {
            if (!err && sqliteUsers) {
              tempDb.all("SELECT * FROM trades", [], (err, sqliteTrades) => {
                if (!err && sqliteTrades) {
                  const migratedData = {
                    users: sqliteUsers.map(u => ({ id: u.id, username: u.username, password: u.password })),
                    trades: sqliteTrades.map(t => ({
                      id: t.id,
                      date: t.date,
                      pair: t.pair,
                      type: t.type,
                      lot_size: t.lot_size,
                      entry_price: t.entry_price,
                      tp: t.tp,
                      sl: t.sl,
                      exit_price: t.exit_price,
                      pips: t.pips,
                      profit: t.profit,
                      status: t.status,
                      notes: t.notes,
                      user_id: t.user_id
                    }))
                  };
                  writeData(migratedData);
                  console.log(`Auto-migration complete! Migrated ${sqliteUsers.length} users and ${sqliteTrades.length} trades.`);
                  tempDb.close(() => {
                    try {
                      fs.renameSync(oldDbPath, path.join(__dirname, 'database.db.backup'));
                    } catch (e) {}
                  });
                }
              });
            }
          });
        }
      });
    } catch (e) {
      console.log("Could not load sqlite3 natively. Skipping SQLite to JSON auto-migration.");
    }
  }

  if (!fs.existsSync(dbFile)) {
    const initialData = { users: [], trades: [] };
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2), 'utf8');
  }

  // Seed default admin user if empty
  const data = readData();
  if (data.users.length === 0) {
    const defaultPwd = crypto.createHash('sha256').update('admin').digest('hex');
    data.users.push({
      id: 1,
      username: 'admin',
      password: defaultPwd
    });
    // Link any existing trades to default user 1
    data.trades.forEach(t => {
      if (!t.user_id) t.user_id = 1;
    });
    writeData(data);
    console.log("Database initialized. Default 'admin' user created.");
  } else {
    // Fill null user_ids
    let updated = false;
    data.trades.forEach(t => {
      if (!t.user_id) {
        t.user_id = 1;
        updated = true;
      }
    });
    if (updated) {
      writeData(data);
    }
    console.log("Database connected successfully.");
  }
}

// Read database helper
function readData() {
  try {
    if (!fs.existsSync(dbFile)) {
      return { users: [], trades: [] };
    }
    const content = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database file, returning default schema:', err.message);
    return { users: [], trades: [] };
  }
}

// Write database helper
function writeData(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write database file:', err.message);
  }
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

  const data = readData();
  const exists = data.users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username sudah terdaftar.' });
  }

  const passwordHash = crypto.createHash('sha256').update(cleanPassword).digest('hex');
  const newUser = {
    id: Date.now() + Math.floor(Math.random() * 100),
    username: cleanUsername,
    password: passwordHash
  };

  data.users.push(newUser);
  writeData(data);
  res.status(201).json({ message: 'Registrasi berhasil!' });
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
  const data = readData();
  const user = data.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.password === passwordHash);
  
  if (!user) {
    return res.status(400).json({ error: 'Username atau password salah.' });
  }

  const token = generateToken(user.id, user.username);
  res.json({
    token,
    username: user.username,
    user_id: user.id
  });
});

// Get all trades
app.get('/api/trades', authenticate, (req, res) => {
  const data = readData();
  const userTrades = data.trades.filter(t => t.user_id === req.user.userId);
  
  // Sort by date desc, then id desc
  userTrades.sort((a, b) => {
    const dateCompare = (b.date || '').localeCompare(a.date || '');
    if (dateCompare !== 0) return dateCompare;
    return b.id - a.id;
  });

  res.json(userTrades);
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

  const data = readData();
  const newTrade = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    date,
    pair,
    type,
    lot_size: parseFloat(lot_size),
    entry_price: parseFloat(entry_price),
    tp: tp ? parseFloat(tp) : null,
    sl: sl ? parseFloat(sl) : null,
    exit_price: exit_price ? parseFloat(exit_price) : null,
    pips: pips ? parseFloat(pips) : null,
    profit: profit ? parseFloat(profit) : null,
    status,
    notes: notes || null,
    user_id: req.user.userId
  };

  data.trades.push(newTrade);
  writeData(data);
  res.status(201).json(newTrade);
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

  const data = readData();
  const tradeIndex = data.trades.findIndex(t => t.id === Number(id) && t.user_id === req.user.userId);
  
  if (tradeIndex === -1) {
    return res.status(404).json({ error: 'Trade not found or unauthorized' });
  }

  const updatedTrade = {
    ...data.trades[tradeIndex],
    date,
    pair,
    type,
    lot_size: parseFloat(lot_size),
    entry_price: parseFloat(entry_price),
    tp: tp ? parseFloat(tp) : null,
    sl: sl ? parseFloat(sl) : null,
    exit_price: exit_price ? parseFloat(exit_price) : null,
    pips: pips ? parseFloat(pips) : null,
    profit: profit ? parseFloat(profit) : null,
    status,
    notes: notes || null
  };

  data.trades[tradeIndex] = updatedTrade;
  writeData(data);
  res.json(updatedTrade);
});

// Delete a trade
app.delete('/api/trades/:id', authenticate, (req, res) => {
  const { id } = req.params;

  const data = readData();
  const initialLength = data.trades.length;
  data.trades = data.trades.filter(t => !(t.id === Number(id) && t.user_id === req.user.userId));
  
  if (data.trades.length === initialLength) {
    return res.status(404).json({ error: 'Trade not found or unauthorized' });
  }

  writeData(data);
  res.json({ message: 'Trade deleted successfully', id: Number(id) });
});

// Initialize database file on startup
initializeDatabase();

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
