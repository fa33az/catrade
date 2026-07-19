import React, { useMemo } from 'react';

export default function PerformanceChart({ trades, currency = 'USD', conversionRate = 15000 }) {
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    // Sort trades by date ascending (oldest first)
    const sorted = [...trades].sort((a, b) => new Date(a.date.replace(/-/g, '/')) - new Date(b.date.replace(/-/g, '/')));
    
    let cumulative = 0;
    return sorted.map((t, idx) => {
      cumulative += Number(t.profit || 0);
      const mult = currency === 'IDR' ? conversionRate : 1;
      return {
        index: idx + 1,
        date: t.date.split(' ')[0] || t.date,
        profit: Number(t.profit || 0) * mult,
        cumulative: cumulative * mult
      };
    });
  }, [trades, currency, conversionRate]);

  const svgParams = useMemo(() => {
    if (chartData.length === 0) return null;

    const width = 600;
    const height = 220;
    const padding = { top: 20, right: 30, bottom: 30, left: 65 }; // Expanded left padding for Rp text

    const xValues = chartData.map((d) => d.index);
    const yValues = chartData.map((d) => d.cumulative);

    const minX = 0; // Start chart from origin
    const maxX = chartData.length;
    
    const minYValue = Math.min(...yValues, 0);
    const maxYValue = Math.max(...yValues, 0);
    
    // Add 15% padding to Y axis
    const yDiff = maxYValue - minYValue;
    const minY = minYValue - (yDiff === 0 ? 10 : yDiff * 0.15);
    const maxY = maxYValue + (yDiff === 0 ? 10 : yDiff * 0.15);

    const getX = (index) => {
      if (maxX === 0) return padding.left;
      return padding.left + (index / maxX) * (width - padding.left - padding.right);
    };

    const getY = (val) => {
      const scale = (val - minY) / (maxY - minY);
      return height - padding.bottom - scale * (height - padding.top - padding.bottom);
    };

    // Build the SVG path string
    let pathD = '';
    let areaD = '';

    if (chartData.length > 0) {
      // Start path at origin (0 cumulative profit)
      const startX = padding.left;
      const startY = getY(0);
      pathD = `M ${startX} ${startY}`;
      areaD = `M ${startX} ${startY}`;

      chartData.forEach((d) => {
        const x = getX(d.index);
        const y = getY(d.cumulative);
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      });

      // Close the area path to the 0 line or bottom
      const endX = getX(chartData.length);
      const zeroY = getY(0);
      areaD += ` L ${endX} ${zeroY} Z`;
    }

    // Gridlines (e.g. 4 horizontal lines)
    const gridLines = [];
    const step = (maxY - minY) / 4;
    for (let i = 0; i <= 4; i++) {
      const val = minY + step * i;
      gridLines.push({
        y: getY(val),
        value: val
      });
    }

    return {
      width,
      height,
      padding,
      getX,
      getY,
      pathD,
      areaD,
      gridLines,
      points: chartData.map(d => ({ x: getX(d.index), y: getY(d.cumulative), ...d }))
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="empty-state" style={{ height: '100%', minHeight: '160px', padding: '1.5rem 1rem' }}>
        <svg className="icon" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline></svg>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Tidak ada data transaksi untuk menampilkan grafik.</p>
      </div>
    );
  }

  const { width, height, padding, pathD, areaD, gridLines, points } = svgParams;

  // Render readable gridline numbers
  const formatChartY = (val) => {
    if (currency === 'IDR') {
      if (Math.abs(val) >= 1000000) {
        return `Rp ${(val / 1000000).toFixed(1)}Jt`;
      }
      if (Math.abs(val) >= 1000) {
        return `Rp ${(val / 1000).toFixed(0)}rb`;
      }
      return `Rp ${val.toFixed(0)}`;
    }
    return `$${val.toFixed(2)}`;
  };

  // Render readable tooltip profit numbers
  const formatTooltipProfit = (val) => {
    if (currency === 'IDR') {
      return `Rp ${val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `$${val.toFixed(2)}`;
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-yellow)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-yellow)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridLines.map((line, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="rgba(0, 0, 0, 0.12)"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={line.y + 4}
              fill="var(--color-text-secondary)"
              fontSize="10"
              fontFamily="var(--font-mono)"
              textAnchor="end"
            >
              {formatChartY(line.value)}
            </text>
          </g>
        ))}

        {/* Shaded Area */}
        {areaD && <path d={areaD} fill="url(#chartGradient)" />}

        {/* The Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-black)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Highlight points */}
        {points.map((p, idx) => (
          <g key={idx} className="chart-dot-group">
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={p.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
              stroke="var(--bg-card)"
              strokeWidth="2"
            />
            <title>
              {`Trade #${p.index} (${p.date})\nProfit: ${formatTooltipProfit(p.profit)}\nCumulative: ${formatTooltipProfit(p.cumulative)}`}
            </title>
          </g>
        ))}

        {/* Bottom Line / X Axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="var(--color-black)"
          strokeWidth="2"
        />

        {/* X Axis Labels */}
        {points.map((p, idx) => {
          // Show max 6 labels along X axis to prevent clutter
          const showLabel = points.length <= 8 || idx % Math.ceil(points.length / 6) === 0 || idx === points.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={idx}
              x={p.x}
              y={height - padding.bottom + 15}
              fill="var(--color-text-secondary)"
              fontSize="9"
              textAnchor="middle"
            >
              #{p.index}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
