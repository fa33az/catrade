import React, { useState, useEffect } from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  username,
  settings,
  onSaveSettings,
  onLogout
}) {
  if (!isOpen) return null;

  const handleCurrencyChange = (val) => {
    onSaveSettings({ ...settings, currency: val });
  };

  const handleRateChange = (val) => {
    const rate = parseFloat(val) || 1;
    onSaveSettings({ ...settings, conversionRate: rate });
  };

  const handleAutoPipsChange = (checked) => {
    onSaveSettings({ ...settings, autoPips: checked });
  };

  const handleTimeframeChange = (val) => {
    onSaveSettings({ ...settings, timeframe: val });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="brutal-card" style={{
        background: 'var(--color-white)',
        width: '100%',
        maxWidth: '440px',
        padding: '1.75rem',
        border: '3px solid #000',
        boxShadow: '6px 6px 0px #000',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            border: '2px solid #000',
            background: 'var(--color-pink)',
            color: 'var(--color-white)',
            fontWeight: '900',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0px #000'
          }}
          title="Tutup"
        >
          ✕
        </button>

        {/* Modal Title */}
        <h3 style={{
          fontSize: '1.4rem',
          fontWeight: '800',
          textTransform: 'uppercase',
          marginBottom: '1.25rem',
          borderBottom: '3px solid #000',
          paddingBottom: '0.5rem',
          letterSpacing: '-0.5px'
        }}>
          Pengaturan Jurnal
        </h3>

        {/* Settings Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
              Mata Uang Jurnal
            </label>
            <select
              value={settings.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid #000',
                fontWeight: '600'
              }}
            >
              <option value="USD">US Dollar ($)</option>
              <option value="IDR">Rupiah Indonesia (Rp)</option>
            </select>
          </div>

          {settings.currency === 'IDR' && (
            <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                Kurs Konversi (1 USD ke IDR)
              </label>
              <input
                type="number"
                value={settings.conversionRate}
                onChange={(e) => handleRateChange(e.target.value)}
                placeholder="Contoh: 15000"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '2px solid #000',
                  fontWeight: '600'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: '700', marginTop: '0.25rem', display: 'block' }}>
                ✓ Diambil otomatis secara realtime di background.
              </span>
            </div>
          )}

          {/* Timeframe selector */}
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
              Rentang Waktu Default (Dashboard & Riwayat)
            </label>
            <select
              value={settings.timeframe || 'all'}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '2px solid #000',
                fontWeight: '600'
              }}
            >
              <option value="weekly">Mingguan (7 Hari Terakhir)</option>
              <option value="monthly">Bulanan (30 Hari Terakhir)</option>
              <option value="all">Semua Transaksi (All Time)</option>
            </select>
          </div>

          {/* Auto Pips Calculation */}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="autoPipsToggle"
              checked={settings.autoPips}
              onChange={(e) => handleAutoPipsChange(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid #000',
                cursor: 'pointer',
                accentColor: 'var(--color-yellow)'
              }}
            />
            <label
              htmlFor="autoPipsToggle"
              style={{
                fontSize: '0.85rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              Auto-Kalkulasi Pips & Profit
            </label>
          </div>
        </div>

        {/* User profile & Logout */}
        <div style={{
          borderTop: '3px solid #000',
          paddingTop: '1.25rem',
          marginTop: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
            Masuk sebagai: <strong style={{ color: 'var(--color-black)', textTransform: 'uppercase' }}>{username}</strong>
          </div>
          <button
            onClick={() => {
              onLogout();
            }}
            className="btn btn-danger"
            style={{
              padding: '0.6rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              textAlign: 'center',
              border: '2px solid #000',
              boxShadow: '3px 3px 0px #000',
              width: '100%'
            }}
          >
            Keluar (Logout)
          </button>
        </div>
      </div>
    </div>
  );
}
