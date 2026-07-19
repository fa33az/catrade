import http.server
import json
import sqlite3
import os
import re
import hashlib

PORT = 5000
DB_FILE = os.path.join(os.path.dirname(__file__), 'database.db')
SECRET_KEY = "super_secret_key_catrade_6767"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # 2. Create trades table
    cursor.execute('''
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
    ''')
    
    # Check table columns for trades
    cursor.execute("PRAGMA table_info(trades)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'user_id' not in columns:
        print("Migrating database: adding user_id to trades table...")
        cursor.execute("ALTER TABLE trades ADD COLUMN user_id INTEGER REFERENCES users(id)")
    
    # Ensure there is at least one default user if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        default_pwd = hashlib.sha256("admin".encode('utf-8')).hexdigest()
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", ("admin", default_pwd))
        # Bind any existing orphan trades to this default admin user (id = 1)
        cursor.execute("UPDATE trades SET user_id = 1 WHERE user_id IS NULL")
        print("Default 'admin' user created with password 'admin'.")

    # In case there are null user_ids, fill them with 1
    cursor.execute("UPDATE trades SET user_id = 1 WHERE user_id IS NULL")

    conn.commit()
    conn.close()
    print("Database initialized successfully at:", DB_FILE)

def generate_token(user_id, username):
    payload = f"{user_id}.{username}"
    sig = hashlib.sha256(f"{payload}.{SECRET_KEY}".encode('utf-8')).hexdigest()
    return f"{payload}.{sig}"

def verify_token(token):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        user_id, username, sig = parts
        payload = f"{user_id}.{username}"
        expected_sig = hashlib.sha256(f"{payload}.{SECRET_KEY}".encode('utf-8')).hexdigest()
        if sig == expected_sig:
            return int(user_id), username
    except Exception:
        pass
    return None

class TradeAPIHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def get_auth_user(self):
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        token = auth_header[7:]
        return verify_token(token)

    def do_GET(self):
        if self.path == '/api/trades':
            user = self.get_auth_user()
            if not user:
                self._set_headers(401)
                self.wfile.write(json.dumps({'error': 'Silakan login terlebih dahulu.'}).encode('utf-8'))
                return
            user_id, _ = user

            try:
                conn = sqlite3.connect(DB_FILE)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM trades WHERE user_id = ? ORDER BY date DESC, id DESC', (user_id,))
                rows = cursor.fetchall()
                conn.close()

                trades = []
                for row in rows:
                    trades.append(dict(row))

                self._set_headers(200)
                self.wfile.write(json.dumps(trades).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))

    def do_POST(self):
        if self.path == '/api/register':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()
                if not username or not password:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Username dan password wajib diisi.'}).encode('utf-8'))
                    return

                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
                if cursor.fetchone():
                    conn.close()
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Username sudah terdaftar.'}).encode('utf-8'))
                    return

                password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password_hash))
                conn.commit()
                conn.close()

                self._set_headers(201)
                self.wfile.write(json.dumps({'message': 'Registrasi berhasil!'}).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

        elif self.path == '/api/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()

                password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                conn = sqlite3.connect(DB_FILE)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT id, username, password FROM users WHERE username = ?", (username,))
                user = cursor.fetchone()
                conn.close()

                if not user or user['password'] != password_hash:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Username atau password salah.'}).encode('utf-8'))
                    return

                token = generate_token(user['id'], user['username'])
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    'token': token,
                    'username': user['username'],
                    'user_id': user['id']
                }).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

        elif self.path == '/api/trades':
            user = self.get_auth_user()
            if not user:
                self._set_headers(401)
                self.wfile.write(json.dumps({'error': 'Silakan login terlebih dahulu.'}).encode('utf-8'))
                return
            user_id, _ = user

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                trade_data = json.loads(post_data.decode('utf-8'))
                
                # Validation
                required = ['date', 'pair', 'type', 'lot_size', 'entry_price', 'status']
                for field in required:
                    if field not in trade_data:
                        self._set_headers(400)
                        self.wfile.write(json.dumps({'error': f'Missing field: {field}'}).encode('utf-8'))
                        return

                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO trades (date, pair, type, lot_size, entry_price, tp, sl, exit_price, pips, profit, status, notes, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    trade_data['date'],
                    trade_data['pair'],
                    trade_data['type'],
                    float(trade_data['lot_size']),
                    float(trade_data['entry_price']),
                    float(trade_data['tp']) if trade_data.get('tp') else None,
                    float(trade_data['sl']) if trade_data.get('sl') else None,
                    float(trade_data['exit_price']) if trade_data.get('exit_price') else None,
                    float(trade_data['pips']) if trade_data.get('pips') else None,
                    float(trade_data['profit']) if trade_data.get('profit') else None,
                    trade_data['status'],
                    trade_data.get('notes'),
                    user_id
                ))
                conn.commit()
                new_id = cursor.lastrowid
                conn.close()

                trade_data['id'] = new_id
                trade_data['user_id'] = user_id
                self._set_headers(201)
                self.wfile.write(json.dumps(trade_data).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)

    def do_PUT(self):
        match = re.match(r'^/api/trades/(\d+)$', self.path)
        if match:
            trade_id = int(match.group(1))
            user = self.get_auth_user()
            if not user:
                self._set_headers(401)
                self.wfile.write(json.dumps({'error': 'Silakan login terlebih dahulu.'}).encode('utf-8'))
                return
            user_id, _ = user

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                trade_data = json.loads(post_data.decode('utf-8'))
                
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE trades 
                    SET date=?, pair=?, type=?, lot_size=?, entry_price=?, tp=?, sl=?, exit_price=?, pips=?, profit=?, status=?, notes=?
                    WHERE id=? AND user_id=?
                ''', (
                    trade_data['date'],
                    trade_data['pair'],
                    trade_data['type'],
                    float(trade_data['lot_size']),
                    float(trade_data['entry_price']),
                    float(trade_data['tp']) if trade_data.get('tp') else None,
                    float(trade_data['sl']) if trade_data.get('sl') else None,
                    float(trade_data['exit_price']) if trade_data.get('exit_price') else None,
                    float(trade_data['pips']) if trade_data.get('pips') else None,
                    float(trade_data['profit']) if trade_data.get('profit') else None,
                    trade_data['status'],
                    trade_data.get('notes'),
                    trade_id,
                    user_id
                ))
                conn.commit()
                changes = conn.total_changes
                conn.close()

                if changes == 0:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({'error': 'Trade not found or unauthorized'}).encode('utf-8'))
                else:
                    trade_data['id'] = trade_id
                    trade_data['user_id'] = user_id
                    self._set_headers(200)
                    self.wfile.write(json.dumps(trade_data).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)

    def do_DELETE(self):
        match = re.match(r'^/api/trades/(\d+)$', self.path)
        if match:
            trade_id = int(match.group(1))
            user = self.get_auth_user()
            if not user:
                self._set_headers(401)
                self.wfile.write(json.dumps({'error': 'Silakan login terlebih dahulu.'}).encode('utf-8'))
                return
            user_id, _ = user

            try:
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute('DELETE FROM trades WHERE id = ? AND user_id = ?', (trade_id, user_id))
                conn.commit()
                rowcount = cursor.rowcount
                conn.close()

                if rowcount == 0:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({'error': 'Trade not found or unauthorized'}).encode('utf-8'))
                else:
                    self._set_headers(200)
                    self.wfile.write(json.dumps({'message': 'Trade deleted successfully', 'id': trade_id}).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)

    # Disable default logging to keep terminal output clean
    def log_message(self, format, *args):
        print(f"[Backend API] {format % args}")

if __name__ == '__main__':
    init_db()
    server = http.server.HTTPServer(('0.0.0.0', PORT), TradeAPIHandler)
    print(f"Backend API server running on http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
