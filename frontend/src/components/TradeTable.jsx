import React, { useState, useMemo } from 'react';
import { Edit, Trash, Info } from './Icons';
import logo from '../assets/logo.png';

export default function TradeTable({ trades, onEdit, onDelete, currency = 'USD', conversionRate = 15000, timeframe = 'all' }) {
  const [filterPair, setFilterPair] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Helper to format date with day name in Indonesian
  const formatDateWithDay = (dateStr) => {
    if (!dateStr) return '-';
    try {
      // Normalize dashes to slashes to prevent timezone offset shifts
      const dateObj = new Date(dateStr.replace(/-/g, '/'));
      if (isNaN(dateObj.getTime())) return dateStr;
      
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayName = days[dateObj.getDay()];
      return `${dayName}, ${dateStr}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to get short day name in Indonesian (for PDF)
  const getShortDayName = (dateStr) => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr.replace(/-/g, '/'));
      if (isNaN(dateObj.getTime())) return '';
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      return days[dateObj.getDay()];
    } catch (e) {
      return '';
    }
  };

  // Filter trades based on state
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchPair = t.pair.toLowerCase().includes(filterPair.toLowerCase().trim());
      const matchType = filterType === 'ALL' || t.type === filterType;
      const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
      return matchPair && matchType && matchStatus;
    });
  }, [trades, filterPair, filterType, filterStatus]);

  const formatProfit = (val) => {
    let num = Number(val || 0);
    if (currency === 'IDR') {
      num = num * conversionRate;
      const sign = num > 0 ? '+' : '';
      return `${sign}Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else {
      const sign = num > 0 ? '+' : '';
      return `${sign}$${num.toFixed(2)}`;
    }
  };

  const formatPips = (val) => {
    const num = Number(val || 0);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}`;
  };

  const handleDownloadPDF = () => {
    if (window.jspdf) {
      generatePDF();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        generatePDF();
      };
      document.head.appendChild(script);
    }
  };

  const generatePDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const now = new Date();

    let periodText = '';
    let pdfFilename = '';
    let reportTitle = '';

    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodText = `Periode: ${oneWeekAgo.toLocaleDateString('id-ID')} - ${now.toLocaleDateString('id-ID')}`;
      pdfFilename = `catrade-laporan-mingguan-${new Date().toISOString().slice(0, 10)}.pdf`;
      reportTitle = "Laporan Jurnal Trading Mingguan";
    } else if (timeframe === 'monthly') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      periodText = `Periode: ${oneMonthAgo.toLocaleDateString('id-ID')} - ${now.toLocaleDateString('id-ID')}`;
      pdfFilename = `catrade-laporan-bulanan-${new Date().toISOString().slice(0, 10)}.pdf`;
      reportTitle = "Laporan Jurnal Trading Bulanan";
    } else {
      periodText = 'Periode: Semua Transaksi (All Time)';
      pdfFilename = `catrade-laporan-semua-${new Date().toISOString().slice(0, 10)}.pdf`;
      reportTitle = "Laporan Jurnal Trading Semua Transaksi";
    }

    const renderRemainingPDF = () => {
      // Horizontal Line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(15, 43, 195, 43);

      // Calculate Stats
      let totalProfit = 0;
      let totalPips = 0;
      let wonCount = 0;
      let lostCount = 0;
      let activeCount = 0;

      trades.forEach(t => {
        const p = parseFloat(t.profit || 0);
        const pip = parseFloat(t.pips || 0);
        totalProfit += p;
        totalPips += pip;
        if (t.status === 'WON') wonCount++;
        else if (t.status === 'LOST') lostCount++;
        else activeCount++;
      });

      const closed = wonCount + lostCount;
      const winRate = closed > 0 ? (wonCount / closed) * 100 : 0;

      const formatPdfProfit = (val) => {
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

      // Render Stats Box
      doc.setFillColor(244, 243, 239);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(15, 47, 180, 25, "FD");
      
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Net Profit: ${formatPdfProfit(totalProfit)}`, 20, 54);
      doc.text(`Total Pip: ${totalPips >= 0 ? '+' : ''}${totalPips.toFixed(1)} pip`, 20, 64);
      doc.text(`Win Rate: ${winRate.toFixed(1)}% (${wonCount} Menang - ${lostCount} Kalah)`, 95, 54);
      doc.text(`Total Transaksi: ${trades.length} (${activeCount} Aktif)`, 95, 64);

      // Table Headers
      let y = 80;
      doc.setFillColor(0, 0, 0);
      doc.rect(15, y, 180, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Tanggal", 17, y + 5.5);
      doc.text("Pair", 48, y + 5.5);
      doc.text("Tipe", 72, y + 5.5);
      doc.text("Lot", 86, y + 5.5);
      doc.text("Entry", 98, y + 5.5);
      doc.text("Exit", 120, y + 5.5);
      doc.text("Pip", 142, y + 5.5);
      doc.text(currency === 'IDR' ? "Profit (Rp)" : "Profit ($)", 162, y + 5.5);
      doc.text("Status", 182, y + 5.5);

      // Table Rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      if (trades.length === 0) {
        y += 8;
        doc.setFillColor(255, 255, 255);
        doc.rect(15, y, 180, 8, "FD");
        const emptyMsg = timeframe === 'weekly' ? 'Tidak ada transaksi dalam 7 hari terakhir.' : 
                          timeframe === 'monthly' ? 'Tidak ada transaksi dalam 30 hari terakhir.' :
                          'Tidak ada transaksi.';
        doc.text(emptyMsg, 20, y + 5.5);
      } else {
        trades.forEach((t, index) => {
          y += 8;
          if (index % 2 === 1) {
            doc.setFillColor(245, 245, 245);
            doc.rect(15, y, 180, 8, "F");
          } else {
            doc.setFillColor(255, 255, 255);
            doc.rect(15, y, 180, 8, "F");
          }
          doc.setDrawColor(220, 220, 220);
          doc.line(15, y + 8, 195, y + 8);
          
          const shortDay = getShortDayName(t.date);
          const datePart = t.date ? t.date.split(' ')[0].slice(5) : ''; // MM-DD
          const tDate = shortDay ? `${shortDay}, ${datePart}` : (t.date ? t.date.split(' ')[0] : '-');
          
          const profitVal = parseFloat(t.profit || 0);
          const pipVal = parseFloat(t.pips || 0);

          let profitTextRow = '';
          if (currency === 'IDR') {
            const rowProfitConverted = profitVal * conversionRate;
            if (t.status === 'WON') {
              profitTextRow = `+Rp ${rowProfitConverted.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            } else if (t.status === 'LOST') {
              profitTextRow = `-Rp ${Math.abs(rowProfitConverted).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            } else {
              profitTextRow = 'Rp 0';
            }
          } else {
            if (t.status === 'WON') {
              profitTextRow = `+$${profitVal.toFixed(2)}`;
            } else if (t.status === 'LOST') {
              profitTextRow = `-$${Math.abs(profitVal).toFixed(2)}`;
            } else {
              profitTextRow = '$0.00';
            }
          }

          doc.text(tDate, 17, y + 5.5);
          doc.text(t.pair || '', 48, y + 5.5);
          doc.text(t.type || '', 72, y + 5.5);
          doc.text(String(t.lot_size || '0.01'), 86, y + 5.5);
          doc.text(String(t.entry_price || ''), 98, y + 5.5);
          doc.text(t.exit_price ? String(t.exit_price) : '-', 120, y + 5.5);
          
          if (t.status === 'WON') {
            doc.setFont("helvetica", "bold");
            doc.text(`+${pipVal.toFixed(1)}`, 142, y + 5.5);
            doc.text(profitTextRow, 162, y + 5.5);
            doc.text("WON", 182, y + 5.5);
          } else if (t.status === 'LOST') {
            doc.setFont("helvetica", "bold");
            doc.text(`${pipVal.toFixed(1)}`, 142, y + 5.5);
            doc.text(profitTextRow, 162, y + 5.5);
            doc.text("LOST", 182, y + 5.5);
          } else {
            doc.setFont("helvetica", "normal");
            doc.text('0.0', 142, y + 5.5);
            doc.text(profitTextRow, 162, y + 5.5);
            doc.text("ACTIVE", 182, y + 5.5);
          }
          doc.setFont("helvetica", "normal");
        });
      }

      doc.save(pdfFilename);
    };

    // Load the logo image asynchronously
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      // Draw the logo at the top left
      doc.addImage(img, 'PNG', 15, 12, 18, 18);

      // Draw the text header shifted to the right (repositioned vertically)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(reportTitle, 38, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 38, 27);
      doc.text(periodText, 38, 32);

      renderRemainingPDF();
    };

    img.onerror = () => {
      // Fallback (repositioned vertically)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(reportTitle, 15, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 15, 27);
      doc.text(periodText, 15, 32);

      renderRemainingPDF();
    };
  };

  return (
    <div className="glass-card">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span className="section-title">Riwayat Transaksi</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Info className="icon-small" />
            <span>Menampilkan {filteredTrades.length} dari {trades.length} transaksi</span>
          </div>
        </div>
        <button 
          className="btn"
          style={{ 
            padding: '0.5rem 1rem', 
            fontSize: '0.85rem', 
            background: 'var(--color-yellow)', 
            color: '#000', 
            border: '2px solid #000', 
            boxShadow: '3px 3px 0px #000',
            fontWeight: '700',
            cursor: 'pointer'
          }}
          onClick={handleDownloadPDF}
        >
          {timeframe === 'weekly' ? 'Download Laporan Mingguan (PDF)' : 
           timeframe === 'monthly' ? 'Download Laporan Bulanan (PDF)' : 
           'Download Semua Laporan (PDF)'}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Filter Pair (contoh: EURUSD)..."
          value={filterPair}
          onChange={(e) => setFilterPair(e.target.value)}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">Semua Tipe</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="WON">WON</option>
          <option value="LOST">LOST</option>
        </select>
        {(filterPair || filterType !== 'ALL' || filterStatus !== 'ALL') && (
          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => {
              setFilterPair('');
              setFilterType('ALL');
              setFilterStatus('ALL');
            }}
          >
            Hapus Filter
          </button>
        )}
      </div>

      {/* Spreadsheet Table (Desktop) */}
      <div className="trade-table-container">
        {filteredTrades.length === 0 ? (
          <div className="empty-state">
            <svg className="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
            <p>Tidak ada transaksi yang cocok dengan filter.</p>
          </div>
        ) : (
          <table className="trade-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pair</th>
                <th>Tipe</th>
                <th>Lot</th>
                <th>Entry</th>
                <th>TP</th>
                <th>SL</th>
                <th>Exit</th>
                <th>Pip</th>
                <th>Profit</th>
                <th>Status</th>
                <th>Catatan</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => {
                const isProfit = Number(trade.profit || 0) > 0;
                const isLoss = Number(trade.profit || 0) < 0;
                const profitClass = isProfit ? 'text-profit text-mono' : isLoss ? 'text-loss text-mono' : 'text-mono';

                return (
                  <tr key={trade.id}>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDateWithDay(trade.date)}
                    </td>
                    <td style={{ fontWeight: '600', letterSpacing: '0.5px' }}>{trade.pair.toUpperCase()}</td>
                    <td>
                      <span className={trade.type === 'BUY' ? 'text-profit' : 'text-loss'} style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="text-mono">{trade.lot_size}</td>
                    <td className="text-mono">{Number(trade.entry_price).toFixed(5).replace(/\.?0+$/, '')}</td>
                    <td className="text-mono" style={{ color: 'var(--color-text-secondary)' }}>
                      {trade.tp ? Number(trade.tp).toFixed(5).replace(/\.?0+$/, '') : '-'}
                    </td>
                    <td className="text-mono" style={{ color: 'var(--color-text-secondary)' }}>
                      {trade.sl ? Number(trade.sl).toFixed(5).replace(/\.?0+$/, '') : '-'}
                    </td>
                    <td className="text-mono">
                      {trade.exit_price ? Number(trade.exit_price).toFixed(5).replace(/\.?0+$/, '') : '-'}
                    </td>
                    <td className={profitClass}>{formatPips(trade.pips)}</td>
                    <td className={profitClass} style={{ fontWeight: '600' }}>{formatProfit(trade.profit)}</td>
                    <td>
                      <span className={`badge ${trade.status.toLowerCase()}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td style={{
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.85rem'
                    }} title={trade.notes}>
                      {trade.notes || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell">
                        <button className="action-btn edit" onClick={() => onEdit(trade)} title="Edit Transaksi">
                          <Edit className="icon-small" />
                        </button>
                        <button className="action-btn delete" onClick={() => onDelete(trade.id)} title="Hapus Transaksi">
                          <Trash className="icon-small" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Trade Cards List (Only shown on mobile) */}
      <div className="trade-cards-container">
        {filteredTrades.length === 0 ? (
          <div className="empty-state">
            <svg className="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
            <p>Tidak ada transaksi yang cocok dengan filter.</p>
          </div>
        ) : (
          filteredTrades.map((trade) => {
            const isProfit = Number(trade.profit || 0) > 0;
            const isLoss = Number(trade.profit || 0) < 0;
            const resultClass = isProfit ? 'text-profit' : isLoss ? 'text-loss' : '';

            return (
              <div key={trade.id} className="brutal-trade-card">
                {/* Header */}
                <div className="brutal-trade-card-header">
                  <div className="brutal-trade-card-pair">{trade.pair.toUpperCase()}</div>
                  <div className="brutal-trade-card-badges">
                    <span className={trade.type === 'BUY' ? 'badge won' : 'badge lost'} style={{ boxShadow: 'none', padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                      {trade.type}
                    </span>
                    <span className={`badge ${trade.status.toLowerCase()}`} style={{ boxShadow: 'none', padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                      {trade.status}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div style={{ fontSize: '0.75rem', color: '#555', fontWeight: '600' }}>
                  {formatDateWithDay(trade.date)}
                </div>

                {/* Details Grid */}
                <div className="brutal-trade-card-grid">
                  <div>
                    <span className="brutal-trade-card-label">Lot:</span>{' '}
                    <span className="brutal-trade-card-value">{trade.lot_size}</span>
                  </div>
                  <div>
                    <span className="brutal-trade-card-label">Entry:</span>{' '}
                    <span className="brutal-trade-card-value">{Number(trade.entry_price).toFixed(5).replace(/\.?0+$/, '')}</span>
                  </div>
                  <div>
                    <span className="brutal-trade-card-label">TP:</span>{' '}
                    <span className="brutal-trade-card-value">{trade.tp ? Number(trade.tp).toFixed(5).replace(/\.?0+$/, '') : '-'}</span>
                  </div>
                  <div>
                    <span className="brutal-trade-card-label">SL:</span>{' '}
                    <span className="brutal-trade-card-value">{trade.sl ? Number(trade.sl).toFixed(5).replace(/\.?0+$/, '') : '-'}</span>
                  </div>
                  {trade.exit_price && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span className="brutal-trade-card-label">Exit:</span>{' '}
                      <span className="brutal-trade-card-value">{Number(trade.exit_price).toFixed(5).replace(/\.?0+$/, '')}</span>
                    </div>
                  )}
                </div>

                {/* Pip & Profit Result Card */}
                <div className="brutal-trade-card-result">
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginRight: '0.25rem' }}>Pip:</span>
                    <span className={resultClass} style={{ fontFamily: 'var(--font-mono)' }}>{formatPips(trade.pips)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginRight: '0.25rem' }}>Profit:</span>
                    <span className={resultClass} style={{ fontFamily: 'var(--font-mono)' }}>{formatProfit(trade.profit)}</span>
                  </div>
                </div>

                {/* Notes */}
                {trade.notes && (
                  <div className="brutal-trade-card-notes">
                    {trade.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="brutal-trade-card-actions">
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', boxShadow: '2px 2px 0px #000' }} onClick={() => onEdit(trade)}>
                    <Edit className="icon-small" /> Edit
                  </button>
                  <button className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', boxShadow: '2px 2px 0px #000' }} onClick={() => onDelete(trade.id)}>
                    <Trash className="icon-small" /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
