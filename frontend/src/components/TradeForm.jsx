import React, { useState, useEffect } from 'react';
import { Plus } from './Icons';

export default function TradeForm({
  onSave,
  editTrade,
  onCancel,
  autoPips = true,
  currency = 'USD',
  conversionRate = 15000
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    pair: 'XAUUSD',
    type: 'BUY',
    lot_size: 0.01,
    entry_price: '',
    tp: '',
    sl: '',
    exit_price: '',
    pips: '',
    profit: '',
    status: 'ACTIVE',
    notes: '',
    asset_type: 'gold', // forex_standard, forex_jpy, gold, crypto
    manual_override: !autoPips
  });

  // Helper to format currency values inside the form
  const formatFormProfit = (val) => {
    let num = Number(val || 0);
    if (currency === 'IDR') {
      num = num * conversionRate;
      const sign = num >= 0 ? '+' : '';
      return `${sign}Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else {
      const sign = num >= 0 ? '+' : '';
      return `${sign}$${num.toFixed(2)}`;
    }
  };

  // Sync manual_override when autoPips setting changes globally
  useEffect(() => {
    setFormData(prev => ({ ...prev, manual_override: !autoPips }));
  }, [autoPips]);

  // Auto-detect asset type based on pair name
  useEffect(() => {
    if (!formData.pair) return;
    const pairUpper = formData.pair.toUpperCase().trim();
    
    let detectedType = 'forex_standard';
    if (pairUpper.endsWith('JPY')) {
      detectedType = 'forex_jpy';
    } else if (pairUpper.includes('XAU') || pairUpper.includes('GOLD') || pairUpper.includes('XAG') || pairUpper.includes('SILVER')) {
      detectedType = 'gold';
    } else if (
      pairUpper.includes('BTC') || 
      pairUpper.includes('ETH') || 
      pairUpper.includes('SOL') || 
      pairUpper.includes('USDT') ||
      pairUpper.includes('US30') ||
      pairUpper.includes('NAS100') ||
      pairUpper.includes('GER30') ||
      pairUpper.includes('SPX')
    ) {
      detectedType = 'crypto';
    }

    setFormData(prev => ({ ...prev, asset_type: detectedType }));
  }, [formData.pair]);

  // Load editing trade if available
  useEffect(() => {
    if (editTrade) {
      // Auto-detect asset type for the trade being edited
      const pairUpper = (editTrade.pair || '').toUpperCase().trim();
      let detectedType = 'forex_standard';
      if (pairUpper.endsWith('JPY')) {
        detectedType = 'forex_jpy';
      } else if (pairUpper.includes('XAU') || pairUpper.includes('GOLD') || pairUpper.includes('XAG') || pairUpper.includes('SILVER')) {
        detectedType = 'gold';
      } else if (
        pairUpper.includes('BTC') || 
        pairUpper.includes('ETH') || 
        pairUpper.includes('SOL') || 
        pairUpper.includes('USDT') ||
        pairUpper.includes('US30') ||
        pairUpper.includes('NAS100') ||
        pairUpper.includes('GER30') ||
        pairUpper.includes('SPX')
      ) {
        detectedType = 'crypto';
      }

      setFormData({
        ...editTrade,
        date: editTrade.date || new Date().toISOString().slice(0, 16).replace('T', ' '),
        asset_type: editTrade.asset_type || detectedType,
        manual_override: editTrade.manual_override !== undefined ? editTrade.manual_override : !autoPips,
        tp: editTrade.tp === null ? '' : editTrade.tp,
        sl: editTrade.sl === null ? '' : editTrade.sl,
        exit_price: editTrade.exit_price === null ? '' : editTrade.exit_price,
        pips: editTrade.pips === null ? '' : editTrade.pips,
        profit: editTrade.profit === null ? '' : editTrade.profit,
        notes: editTrade.notes === null ? '' : editTrade.notes
      });
      setStep(1); // Reset to first step when editing
    } else {
      resetForm();
    }
  }, [editTrade]);

  // Handle auto-calculations of Pips and Profit
  useEffect(() => {
    if (formData.manual_override) return;

    const entry = parseFloat(formData.entry_price);
    const exit = parseFloat(formData.exit_price);
    const lot = parseFloat(formData.lot_size);
    const type = formData.type;
    const assetType = formData.asset_type;

    if (isNaN(entry) || isNaN(lot)) {
      setFormData(prev => ({ ...prev, pips: '', profit: '' }));
      return;
    }

    // Auto-status helper
    let autoStatus = formData.status;
    if (formData.status === 'ACTIVE' && !isNaN(exit) && exit !== entry) {
      autoStatus = (type === 'BUY' ? (exit - entry) : (entry - exit)) >= 0 ? 'WON' : 'LOST';
    } else if (formData.status !== 'ACTIVE' && !isNaN(exit) && exit !== entry) {
      autoStatus = (type === 'BUY' ? (exit - entry) : (entry - exit)) >= 0 ? 'WON' : 'LOST';
    }

    const calcExit = autoStatus === 'ACTIVE' || isNaN(exit) ? entry : exit;

    // 1. Calculate Pips
    let pipSize = 0.0001; 
    if (assetType === 'forex_jpy') pipSize = 0.01;
    if (assetType === 'gold') pipSize = 0.1; // 1 dollar = 10 pips
    if (assetType === 'crypto') pipSize = 1.0;

    let pipsCalculated = 0;
    if (type === 'BUY') {
      pipsCalculated = (calcExit - entry) / pipSize;
    } else {
      pipsCalculated = (entry - calcExit) / pipSize;
    }

    // 2. Calculate Profit ($)
    let profitCalculated = 0;
    if (assetType === 'forex_standard') {
      profitCalculated = (type === 'BUY' ? (calcExit - entry) : (entry - calcExit)) * lot * 100000;
    } else if (assetType === 'forex_jpy') {
      const profitInJPY = (type === 'BUY' ? (calcExit - entry) : (entry - calcExit)) * lot * 100000;
      profitCalculated = calcExit !== 0 ? (profitInJPY / calcExit) : 0;
    } else if (assetType === 'gold') {
      profitCalculated = (type === 'BUY' ? (calcExit - entry) : (entry - calcExit)) * lot * 100;
    } else {
      profitCalculated = (type === 'BUY' ? (calcExit - entry) : (entry - calcExit)) * lot;
    }

    // Adjust status to reflect profit/loss if completed
    if (autoStatus !== 'ACTIVE') {
      autoStatus = profitCalculated >= 0 ? 'WON' : 'LOST';
    }

    setFormData(prev => ({
      ...prev,
      pips: autoStatus === 'ACTIVE' ? '0.0' : pipsCalculated.toFixed(1),
      profit: autoStatus === 'ACTIVE' ? '0.00' : profitCalculated.toFixed(2),
      status: autoStatus
    }));
  }, [
    formData.entry_price,
    formData.exit_price,
    formData.lot_size,
    formData.type,
    formData.asset_type,
    formData.status,
    formData.manual_override
  ]);

  // Calculate potential TP/SL values for real-time preview
  const getPotentialMetrics = () => {
    const entry = parseFloat(formData.entry_price);
    const lot = parseFloat(formData.lot_size);
    const tp = parseFloat(formData.tp);
    const sl = parseFloat(formData.sl);
    const type = formData.type;
    const assetType = formData.asset_type;

    if (isNaN(entry) || isNaN(lot)) return { tpText: '', slText: '' };

    let pipSize = 0.0001; 
    if (assetType === 'forex_jpy') pipSize = 0.01;
    if (assetType === 'gold') pipSize = 0.1; // 1 dollar = 10 pips
    if (assetType === 'crypto') pipSize = 1.0;

    let tpText = '';
    if (!isNaN(tp)) {
      let tpPips = 0;
      let tpProfit = 0;
      if (type === 'BUY') {
        tpPips = (tp - entry) / pipSize;
        if (assetType === 'forex_standard') tpProfit = (tp - entry) * lot * 100000;
        else if (assetType === 'forex_jpy') tpProfit = tp !== 0 ? (((tp - entry) * lot * 100000) / tp) : 0;
        else if (assetType === 'gold') tpProfit = (tp - entry) * lot * 100;
        else tpProfit = (tp - entry) * lot;
      } else {
        tpPips = (entry - tp) / pipSize;
        if (assetType === 'forex_standard') tpProfit = (entry - tp) * lot * 100000;
        else if (assetType === 'forex_jpy') tpProfit = tp !== 0 ? (((entry - tp) * lot * 100000) / tp) : 0;
        else if (assetType === 'gold') tpProfit = (entry - tp) * lot * 100;
        else tpProfit = (entry - tp) * lot;
      }
      tpText = `Target TP (${lot} Lot): ${tpPips >= 0 ? '+' : ''}${tpPips.toFixed(1)} pip (${formatFormProfit(tpProfit)})`;
    }

    let slText = '';
    if (!isNaN(sl)) {
      let slPips = 0;
      let slProfit = 0;
      if (type === 'BUY') {
        slPips = (sl - entry) / pipSize;
        if (assetType === 'forex_standard') slProfit = (sl - entry) * lot * 100000;
        else if (assetType === 'forex_jpy') slProfit = sl !== 0 ? (((sl - entry) * lot * 100000) / sl) : 0;
        else if (assetType === 'gold') slProfit = (sl - entry) * lot * 100;
        else slProfit = (sl - entry) * lot;
      } else {
        slPips = (entry - sl) / pipSize;
        if (assetType === 'forex_standard') slProfit = (entry - sl) * lot * 100000;
        else if (assetType === 'forex_jpy') slProfit = sl !== 0 ? (((entry - sl) * lot * 100000) / sl) : 0;
        else if (assetType === 'gold') slProfit = (entry - sl) * lot * 100;
        else slProfit = (entry - sl) * lot;
      }
      slText = `Risiko SL (${lot} Lot): ${slPips >= 0 ? '+' : ''}${slPips.toFixed(1)} pip (${formatFormProfit(slProfit)})`;
    }

    return { tpText, slText };
  };

  const { tpText, slText } = getPotentialMetrics();

  // Calculate live actual exit metrics for step 2 preview
  const getLiveExitMetrics = () => {
    const entry = parseFloat(formData.entry_price);
    const exit = parseFloat(formData.exit_price);
    const lot = parseFloat(formData.lot_size);
    const type = formData.type;
    const assetType = formData.asset_type;

    if (isNaN(entry) || isNaN(exit) || isNaN(lot)) return null;

    let pipSize = 0.0001; 
    if (assetType === 'forex_jpy') pipSize = 0.01;
    if (assetType === 'gold') pipSize = 0.1; // 1 dollar = 10 pips
    if (assetType === 'crypto') pipSize = 1.0;

    let pipsCalculated = 0;
    if (type === 'BUY') {
      pipsCalculated = (exit - entry) / pipSize;
    } else {
      pipsCalculated = (entry - exit) / pipSize;
    }

    let profitCalculated = 0;
    if (assetType === 'forex_standard') {
      profitCalculated = (type === 'BUY' ? (exit - entry) : (entry - exit)) * lot * 100000;
    } else if (assetType === 'forex_jpy') {
      const profitInJPY = (type === 'BUY' ? (exit - entry) : (entry - exit)) * lot * 100000;
      profitCalculated = exit !== 0 ? (profitInJPY / exit) : 0;
    } else if (assetType === 'gold') {
      profitCalculated = (type === 'BUY' ? (exit - entry) : (entry - exit)) * lot * 100;
    } else {
      profitCalculated = (type === 'BUY' ? (exit - entry) : (entry - exit)) * lot;
    }

    return {
      pips: pipsCalculated.toFixed(1),
      profit: profitCalculated.toFixed(2),
      isWin: profitCalculated >= 0
    };
  };

  const liveExit = getLiveExitMetrics();

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value
    }));
  };

  // Dedicated handler for manual override profit inputs to support live currency conversions
  const handleProfitChange = (e) => {
    const val = e.target.value;
    if (currency === 'IDR') {
      // Convert Rupiah value entered by user back into USD for database storage
      const valInUSD = val ? (parseFloat(val) / conversionRate).toFixed(4) : '';
      setFormData(prev => ({ ...prev, profit: valInUSD }));
    } else {
      setFormData(prev => ({ ...prev, profit: val }));
    }
  };

  const displayProfitValue = () => {
    if (!formData.profit) return '';
    if (currency === 'IDR') {
      return (parseFloat(formData.profit) * conversionRate).toFixed(0);
    }
    return formData.profit;
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      pair: 'XAUUSD',
      type: 'BUY',
      lot_size: 0.01,
      entry_price: '',
      tp: '',
      sl: '',
      exit_price: '',
      pips: '',
      profit: '',
      status: 'ACTIVE',
      notes: '',
      asset_type: 'gold',
      manual_override: !autoPips
    });
    setStep(1);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.pair || !formData.lot_size) {
        alert('Pair dan Ukuran Lot wajib diisi.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.entry_price) {
        alert('Harga Entry wajib diisi.');
        return;
      }
      if (formData.status !== 'ACTIVE' && !formData.exit_price) {
        alert('Harga Exit wajib diisi untuk transaksi yang sudah selesai (WON/LOST).');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.pair || !formData.entry_price) {
      alert('Pair dan Harga Entry wajib diisi.');
      return;
    }
    if (formData.status !== 'ACTIVE' && !formData.exit_price) {
      alert('Harga Exit wajib diisi untuk transaksi yang sudah selesai (WON/LOST).');
      return;
    }
    onSave(formData);
    if (!editTrade) resetForm();
  };

  return (
    <div className="glass-card sticky-form">
      <div className="section-header">
        <span className="section-title">{editTrade ? 'Edit Transaksi' : 'Catat Transaksi'}</span>
        {editTrade ? (
          <button className="btn btn-secondary" onClick={onCancel} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Batal
          </button>
        ) : (
          step > 1 && (
            <button className="btn btn-secondary" onClick={resetForm} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Batal
            </button>
          )
        )}
      </div>

      {/* Progress Steps Tracker */}
      <div className="form-steps-tracker">
        <div className={`form-step-indicator ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => setStep(1)} style={{ cursor: 'pointer' }}>
          1. Info
        </div>
        <div 
          className={`form-step-indicator ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} 
          onClick={() => {
            if (formData.pair && formData.lot_size) setStep(2);
          }} 
          style={{ cursor: formData.pair && formData.lot_size ? 'pointer' : 'not-allowed' }}
        >
          2. Harga
        </div>
        <div 
          className={`form-step-indicator ${step === 3 ? 'active' : ''}`}
          onClick={() => {
            if (formData.pair && formData.lot_size && formData.entry_price) setStep(3);
          }}
          style={{ cursor: formData.pair && formData.lot_size && formData.entry_price ? 'pointer' : 'not-allowed' }}
        >
          3. Hasil
        </div>
      </div>

      <form className="trade-form" onSubmit={handleSubmit}>
        {/* STEP 1: TRANSACTION INFO */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="form-group">
              <label htmlFor="status">Status Transaksi</label>
              <select 
                id="status" 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                style={{
                  backgroundColor: formData.status === 'WON' 
                    ? 'var(--color-success-bg)' 
                    : formData.status === 'LOST' 
                      ? 'var(--color-danger-bg)' 
                      : 'var(--color-pending-bg)',
                  color: 'var(--color-black)',
                  fontWeight: '700'
                }}
              >
                <option value="ACTIVE" style={{ backgroundColor: 'var(--color-pending-bg)', color: '#000' }}>ACTIVE (Sedang Jalan)</option>
                <option value="WON" style={{ backgroundColor: 'var(--color-success-bg)', color: '#000' }}>WON (Sudah Selesai - Profit)</option>
                <option value="LOST" style={{ backgroundColor: 'var(--color-danger-bg)', color: '#000' }}>LOST (Sudah Selesai - Loss)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="date">Tanggal & Waktu</label>
              <input
                type="text"
                id="date"
                name="date"
                placeholder="YYYY-MM-DD HH:MM"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="pair">Pair / Simbol</label>
              <input
                type="text"
                id="pair"
                name="pair"
                placeholder="Contoh: EURUSD, XAUUSD"
                value={formData.pair}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Tipe</label>
                <select 
                  id="type" 
                  name="type" 
                  value={formData.type} 
                  onChange={handleChange}
                  style={{
                    backgroundColor: formData.type === 'BUY' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    color: 'var(--color-black)',
                    fontWeight: '700'
                  }}
                >
                  <option value="BUY" style={{ backgroundColor: 'var(--color-success-bg)', color: '#000' }}>BUY</option>
                  <option value="SELL" style={{ backgroundColor: 'var(--color-danger-bg)', color: '#000' }}>SELL</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lot_size">Ukuran Lot</label>
                <input
                  type="number"
                  id="lot_size"
                  name="lot_size"
                  step="0.01"
                  min="0.001"
                  value={formData.lot_size}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="asset_type">Jenis Aset</label>
              <select id="asset_type" name="asset_type" value={formData.asset_type} onChange={handleChange}>
                <option value="forex_standard">Forex Standard (0.0001)</option>
                <option value="forex_jpy">Forex JPY (0.01)</option>
                <option value="gold">Gold / Komoditas (0.1)</option>
                <option value="crypto">Crypto / Indeks (1.0)</option>
              </select>
            </div>
            
            <div className="form-step-actions">
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PRICE PARAMETERS */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="form-group">
              <label htmlFor="entry_price">Harga Entry</label>
              <input
                type="number"
                id="entry_price"
                name="entry_price"
                step="any"
                value={formData.entry_price}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>
            {formData.status !== 'ACTIVE' && (
              <div className="form-group">
                <label htmlFor="exit_price">Harga Exit</label>
                <input
                  type="number"
                  id="exit_price"
                  name="exit_price"
                  step="any"
                  placeholder="Harga penutupan transaksi"
                  value={formData.exit_price}
                  onChange={handleChange}
                  required
                />
                {liveExit && (
                  <span style={{ fontSize: '0.8rem', color: liveExit.isWin ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: '700', marginTop: '2px' }}>
                    Hasil Real-time (${parseFloat(formData.lot_size) || 0.01} Lot): {liveExit.pips >= 0 ? '+' : ''}{liveExit.pips} pip ({formatFormProfit(liveExit.profit)})
                  </span>
                )}
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tp">Take Profit (TP)</label>
                <input
                  type="number"
                  id="tp"
                  name="tp"
                  step="any"
                  placeholder="Harga Target"
                  value={formData.tp}
                  onChange={handleChange}
                />
                {tpText && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: '700', marginTop: '2px' }}>
                    {tpText}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="sl">Stop Loss (SL)</label>
                <input
                  type="number"
                  id="sl"
                  name="sl"
                  step="any"
                  placeholder="Harga Stop"
                  value={formData.sl}
                  onChange={handleChange}
                />
                {slText && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: '700', marginTop: '2px' }}>
                    {slText}
                  </span>
                )}
              </div>
            </div>
            
            <div className="form-step-actions">
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Kembali
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CALCULATIONS AND SUBMIT */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {formData.status === 'ACTIVE' ? (
              <div className="brutal-card" style={{ background: 'var(--color-pending-bg)', padding: '1rem', border: '3px solid #000', boxShadow: '3px 3px 0px #000' }}>
                <span style={{ fontWeight: '800', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>TRANSAKSI BERJALAN (ACTIVE)</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                  Posisi akan dicatat sebagai transaksi aktif (sedang jalan). Hasil Pip dan Profit akan dikalkulasi otomatis setelah Anda menutup transaksi ini (memasukkan Harga Exit) nanti.
                </span>
              </div>
            ) : (
              <>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="manual_override"
                    name="manual_override"
                    checked={formData.manual_override}
                    onChange={handleChange}
                  />
                  <label htmlFor="manual_override">Override Manual (Kalkulasi Pip & Profit)</label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pips">Kalkulasi Pip</label>
                    <input
                      type="number"
                      id="pips"
                      name="pips"
                      step="any"
                      readOnly={!formData.manual_override}
                      value={formData.pips}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profit">Profit ({currency === 'IDR' ? 'Rp' : '$'})</label>
                    <input
                      type="number"
                      id="profit"
                      name="profit"
                      step="any"
                      readOnly={!formData.manual_override}
                      value={displayProfitValue()}
                      onChange={handleProfitChange}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="notes">Catatan / Konfluens</label>
              <textarea
                id="notes"
                name="notes"
                rows="2"
                placeholder="Contoh: Entry FVG, pantulan support, rilis berita"
                value={formData.notes}
                onChange={handleChange}
                autoFocus
              />
            </div>
            
            <div className="form-step-actions">
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Kembali
              </button>
              <button type="submit" className="btn btn-primary">
                <Plus className="icon-small" />
                {editTrade ? 'Simpan Perubahan' : 'Catat Transaksi'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
