import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import TradeTable from './components/TradeTable';
import TradeForm from './components/TradeForm';
import PerformanceChart from './components/PerformanceChart';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import logo from './assets/logo.png';
import { BookOpen, TrendingUp, Plus, SettingsIcon } from './components/Icons';

const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  const [trades, setTrades] = useState([]);
  const [editTrade, setEditTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'catat', 'riwayat'

  // User session state
  const [token, setToken] = useState(() => localStorage.getItem('catrade_token') || null);
  const [username, setUsername] = useState(() => localStorage.getItem('catrade_username') || null);

  // Settings state with timeframe support
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('catrade_settings');
    const defaultSettings = { currency: 'USD', conversionRate: 15000, autoPips: true, timeframe: 'all' };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  // Fetch trades from backend
  const fetchTrades = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/trades`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        throw new Error('Sesi kedaluwarsa. Silakan masuk kembali.');
      }
      if (!res.ok) throw new Error('Gagal memuat data transaksi.');
      const data = await res.json();
      setTrades(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Tidak dapat terhubung ke server backend. Pastikan server sudah berjalan.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR');
      if (!res.ok) throw new Error('Frankfurter failed');
      const data = await res.json();
      if (data && data.rates && data.rates.IDR) {
        const rate = Math.round(data.rates.IDR);
        setSettings(prev => {
          const updated = { ...prev, conversionRate: rate };
          localStorage.setItem('catrade_settings', JSON.stringify(updated));
          return updated;
        });
        console.log('Background exchange rate updated via Frankfurter:', rate);
      }
    } catch (e) {
      console.warn('API Frankfurter failed, trying fallback...', e.message);
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error('Fallback failed');
        const data = await res.json();
        if (data && data.rates && data.rates.IDR) {
          const rate = Math.round(data.rates.IDR);
          setSettings(prev => {
            const updated = { ...prev, conversionRate: rate };
            localStorage.setItem('catrade_settings', JSON.stringify(updated));
            return updated;
          });
          console.log('Background exchange rate updated via Fallback:', rate);
        }
      } catch (err) {
        console.error('All exchange rate APIs failed in background:', err);
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrades();
    }
  }, [token]);

  useEffect(() => {
    if (settings.currency === 'IDR') {
      fetchExchangeRate();
    }
  }, [settings.currency]);

  // Auth Handlers
  const handleLoginSuccess = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem('catrade_token', newToken);
    localStorage.setItem('catrade_username', newUsername);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    setTrades([]);
    localStorage.removeItem('catrade_token');
    localStorage.removeItem('catrade_username');
    setIsSettingsOpen(false);
  };

  const triggerLogout = () => {
    showConfirm('Yakin ingin keluar dari akun ini?', () => {
      handleLogout();
    });
  };

  // Save trade (Create or Update)
  const handleSaveTrade = async (tradeData) => {
    if (!token) return;
    try {
      const isEdit = !!tradeData.id;
      const url = isEdit ? `${API_BASE_URL}/trades/${tradeData.id}` : `${API_BASE_URL}/trades`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tradeData)
      });

      if (res.status === 401) {
        handleLogout();
        throw new Error('Sesi kedaluwarsa. Silakan login kembali.');
      }
      if (!res.ok) throw new Error('Gagal menyimpan transaksi.');

      await fetchTrades();
      setEditTrade(null);
      // Auto switch back to riwayat after saving
      setActiveTab('riwayat');
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete trade
  const handleDeleteTrade = (id) => {
    showConfirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?', async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/trades/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
          handleLogout();
          throw new Error('Sesi kedaluwarsa. Silakan login kembali.');
        }
        if (!res.ok) throw new Error('Gagal menghapus transaksi.');

        await fetchTrades();
        if (editTrade && editTrade.id === id) {
          setEditTrade(null);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  };

  // Helper to intercept edit trade action to show the form tab on mobile
  const handleEditClick = (trade) => {
    setEditTrade(trade);
    setActiveTab('catat');
  };

  // Filter trades depending on global settings timeframe
  const filteredTrades = useMemo(() => {
    if (!settings.timeframe || settings.timeframe === 'all') return trades;
    
    const now = new Date();
    const days = settings.timeframe === 'weekly' ? 7 : 30;
    
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    limitDate.setHours(0, 0, 0, 0);

    return trades.filter(t => {
      if (!t.date) return false;
      const tradeDate = new Date(t.date.replace(/-/g, '/'));
      return tradeDate >= limitDate;
    });
  }, [trades, settings.timeframe]);

  // Render LoginScreen if not authenticated
  if (!token) {
    return <LoginScreen apiBaseUrl={API_BASE_URL} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <img src={logo} alt="catrade logo" style={{ height: '80px', border: 'none', background: 'none', boxShadow: 'none', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="action-btn"
            style={{
              padding: '0.45rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px #000',
              background: 'var(--color-yellow)',
              cursor: 'pointer'
            }}
            title="Pengaturan"
          >
            <SettingsIcon className="icon-small" style={{ color: '#000' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }} className="desktop-only">
            <BookOpen className="icon" />
            <span style={{ color: 'var(--color-black)', fontWeight: '700' }}>Sesi Aktif: {username}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="brutal-card" style={{ background: 'var(--color-danger-bg)' }}>
          <span style={{ fontWeight: '800' }}>MASALAH KONEKSI: </span>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={fetchTrades} style={{ marginLeft: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* DESKTOP LAYOUT (Grid) */}
      <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Stats Dashboard */}
        <Dashboard trades={filteredTrades} currency={settings.currency} conversionRate={settings.conversionRate} />

        <div className="dashboard-main">
          {/* Left Side: Chart & Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Equity Chart Card */}
            <div className="brutal-card">
              <span className="section-title" style={{ display: 'block', marginBottom: '1rem' }}>
                Pertumbuhan Profit Kumulatif ({settings.currency === 'IDR' ? 'Rp' : '$'})
              </span>
              <div className="chart-container">
                <PerformanceChart trades={filteredTrades} currency={settings.currency} conversionRate={settings.conversionRate} />
              </div>
            </div>

            {/* Spreadsheet Table */}
            <TradeTable
              trades={filteredTrades}
              onEdit={handleEditClick}
              onDelete={handleDeleteTrade}
              currency={settings.currency}
              conversionRate={settings.conversionRate}
              timeframe={settings.timeframe}
            />
          </div>

          {/* Right Side: Logging Form */}
          <div style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
            <TradeForm
              onSave={handleSaveTrade}
              editTrade={editTrade}
              onCancel={() => setEditTrade(null)}
              autoPips={settings.autoPips}
              currency={settings.currency}
              conversionRate={settings.conversionRate}
            />
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      {/* Dynamic Mobile View Render */}
      <div className="mobile-render-container">
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Dashboard trades={filteredTrades} currency={settings.currency} conversionRate={settings.conversionRate} />
            <div className="brutal-card">
              <span className="section-title" style={{ display: 'block', marginBottom: '1rem' }}>
                Profit Kumulatif ({settings.currency === 'IDR' ? 'Rp' : '$'})
              </span>
              <div className="chart-container">
                <PerformanceChart trades={filteredTrades} currency={settings.currency} conversionRate={settings.conversionRate} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'catat' && (
          <TradeForm
            onSave={handleSaveTrade}
            editTrade={editTrade}
            onCancel={() => {
              setEditTrade(null);
              setActiveTab('riwayat');
            }}
            autoPips={settings.autoPips}
            currency={settings.currency}
            conversionRate={settings.conversionRate}
          />
        )}

        {activeTab === 'riwayat' && (
          <TradeTable
            trades={filteredTrades}
            onEdit={handleEditClick}
            onDelete={handleDeleteTrade}
            currency={settings.currency}
            conversionRate={settings.conversionRate}
            timeframe={settings.timeframe}
          />
        )}
      </div>

      {/* Bottom Navigation Bar for Mobile */}
      <nav className="mobile-nav-bar">
        <button
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <TrendingUp className="icon-small" />
          <span>Dashboard</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === 'catat' ? 'active' : ''}`}
          onClick={() => setActiveTab('catat')}
        >
          <Plus className="icon-small" />
          <span>Catat</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === 'riwayat' ? 'active' : ''}`}
          onClick={() => setActiveTab('riwayat')}
        >
          <BookOpen className="icon-small" />
          <span>Riwayat</span>
        </button>
      </nav>

      {/* Settings Modal Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        username={username}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          localStorage.setItem('catrade_settings', JSON.stringify(newSettings));
        }}
        onLogout={triggerLogout}
      />

      {/* Custom Confirmation Modal Box UI */}
      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 9999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div className="brutal-card animate-fade-in" style={{
            background: 'var(--color-white)',
            border: '3px solid #000',
            boxShadow: '8px 8px 0px #000',
            width: '100%',
            maxWidth: '380px',
            padding: '1.75rem',
            borderRadius: '6px',
            boxSizing: 'border-box',
            textAlign: 'center',
            transform: 'rotate(-0.5deg)'
          }}>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '800',
              marginBottom: '1.5rem',
              color: '#000',
              lineHeight: '1.4',
              textTransform: 'uppercase',
              letterSpacing: '-0.5px'
            }}>
              {confirmDialog.message}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0px #000'
                }}
              >
                Batal
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDialog.onConfirm}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0px #000'
                }}
              >
                Ya, Lanjut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
