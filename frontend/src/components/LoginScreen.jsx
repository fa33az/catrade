import React, { useState } from 'react';
import logo from '../assets/logo.png';

export default function LoginScreen({ apiBaseUrl, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const userClean = username.trim();
    const pwdClean = password.trim();

    if (!userClean || !pwdClean) {
      setMsg({ type: 'error', text: 'Username dan Password wajib diisi.' });
      return;
    }

    if (isRegister && pwdClean !== confirmPassword.trim()) {
      setMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/register' : '/login';
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userClean, password: pwdClean })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan sistem.');
      }

      if (isRegister) {
        setMsg({ type: 'success', text: 'Registrasi berhasil! Silakan masuk.' });
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        // Login success
        onLoginSuccess(data.token, data.username);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '1rem'
    }}>
      <div className="brutal-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        background: 'var(--color-white)',
        boxShadow: 'var(--brutal-shadow)'
      }}>
        {/* Logo and Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={logo} 
            alt="catrade logo" 
            style={{ 
              height: '65px', 
              display: 'block'
            }} 
          />
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          border: '2px solid #000',
          boxShadow: '2px 2px 0px #000',
          marginBottom: '1.5rem',
          background: '#000',
          gap: '2px'
        }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setMsg({ type: '', text: '' });
            }}
            style={{
              flex: 1,
              padding: '0.6rem',
              fontWeight: '800',
              fontSize: '0.9rem',
              cursor: 'pointer',
              border: 'none',
              background: !isRegister ? 'var(--color-yellow)' : 'var(--color-white)',
              color: '#000',
              textTransform: 'uppercase',
              transition: 'background 0.1s'
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setMsg({ type: '', text: '' });
            }}
            style={{
              flex: 1,
              padding: '0.6rem',
              fontWeight: '800',
              fontSize: '0.9rem',
              cursor: 'pointer',
              border: 'none',
              background: isRegister ? 'var(--color-yellow)' : 'var(--color-white)',
              color: '#000',
              textTransform: 'uppercase',
              transition: 'background 0.1s'
            }}
          >
            Daftar
          </button>
        </div>

        {/* Notification Banner */}
        {msg.text && (
          <div style={{
            border: '2px solid #000',
            padding: '0.75rem',
            marginBottom: '1rem',
            background: msg.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            color: msg.type === 'error' ? 'var(--color-white)' : 'var(--color-black)',
            fontWeight: '700',
            fontSize: '0.85rem',
            boxShadow: '2px 2px 0px #000'
          }}>
            {msg.text}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Masukkan username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '2px solid #000',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Masukkan password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '2px solid #000',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                Konfirmasi Password
              </label>
              <input
                type="password"
                placeholder="Ulangi password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '2px solid #000',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '0.5rem',
              border: '2px solid #000',
              boxShadow: '3px 3px 0px #000',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Memproses...' : isRegister ? 'Daftar Akun Baru' : 'Masuk Ke Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
