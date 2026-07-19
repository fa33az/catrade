import React, { useMemo } from 'react';
import { Dollar, Award, TrendingUp, Percent, Scale } from './Icons';

export default function Dashboard({ trades, currency = 'USD', conversionRate = 15000 }) {
  const stats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalProfit: 0,
        totalPips: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0,
        wonTrades: 0,
        lostTrades: 0,
        activeTrades: 0
      };
    }

    let totalProfit = 0;
    let totalPips = 0;
    let wonCount = 0;
    let lostCount = 0;
    let activeCount = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    trades.forEach((t) => {
      const profit = Number(t.profit || 0);
      const pips = Number(t.pips || 0);
      
      totalProfit += profit;
      totalPips += pips;

      if (t.status === 'WON') {
        wonCount++;
        grossProfit += profit;
      } else if (t.status === 'LOST') {
        lostCount++;
        grossLoss += Math.abs(profit);
      } else {
        activeCount++;
      }
    });

    const closedTrades = wonCount + lostCount;
    const winRate = closedTrades > 0 ? (wonCount / closedTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      totalProfit,
      totalPips,
      winRate,
      profitFactor,
      totalTrades: trades.length,
      wonTrades: wonCount,
      lostTrades: lostCount,
      activeTrades: activeCount
    };
  }, [trades]);

  const profitClass = stats.totalProfit >= 0 ? 'text-profit' : 'text-loss';
  const pipsClass = stats.totalPips >= 0 ? 'text-profit' : 'text-loss';

  // Format profit value depending on currency settings
  const formatNetProfit = (val) => {
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

  const formatGrossProfit = (val) => {
    let num = Number(val || 0);
    if (currency === 'IDR') {
      num = num * conversionRate;
      return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  const grossProfitVal = trades.reduce((acc, t) => t.status === 'WON' ? acc + Number(t.profit) : acc, 0);

  return (
    <div className="metrics-grid">
      <div className="glass-card metric-card profit">
        <span className="metric-label">Net Profit</span>
        <span className={`metric-value ${profitClass}`}>
          {formatNetProfit(stats.totalProfit)}
        </span>
        <span className="metric-sub">
          Profit Kotor: {formatGrossProfit(grossProfitVal)}
        </span>
      </div>

      <div className="glass-card metric-card pips">
        <span className="metric-label">Total Pip</span>
        <span className={`metric-value ${pipsClass}`}>
          {stats.totalPips >= 0 ? '+' : ''}{stats.totalPips.toFixed(1)}
        </span>
        <span className="metric-sub">Dari transaksi selesai</span>
      </div>

      <div className="glass-card metric-card winrate">
        <span className="metric-label">Rasio Kemenangan</span>
        <span className="metric-value" style={{ color: stats.winRate >= 50 ? 'var(--color-success)' : 'var(--color-pending)' }}>
          {stats.winRate.toFixed(1)}%
        </span>
        <span className="metric-sub">
          {stats.wonTrades} Menang - {stats.lostTrades} Kalah
        </span>
      </div>

      <div className="glass-card metric-card factor">
        <span className="metric-label">Faktor Profit</span>
        <span className="metric-value">
          {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
        </span>
        <span className="metric-sub">Gross win / Gross loss</span>
      </div>

      <div className="glass-card metric-card total-trades">
        <span className="metric-label">Total Transaksi</span>
        <span className="metric-value" style={{ color: 'var(--color-primary)' }}>
          {stats.totalTrades}
        </span>
        <span className="metric-sub">
          {stats.activeTrades} Aktif / {stats.wonTrades + stats.lostTrades} Selesai
        </span>
      </div>
    </div>
  );
}
