import { useState } from 'react';
import { Progress, ratioTone } from './ui';
import { formatDate, percent } from '../lib/format';

type Segment = { label: string; value: number; color: string };

/** Anillo de proporciones; el total va al centro. */
export function Donut({ segments, centerLabel }: { segments: Segment[]; centerLabel: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={segments.map(segment => `${segment.label}: ${segment.value}`).join(', ')}>
        <circle cx="70" cy="70" r={radius} className="donut-track" />
        {total > 0 && segments.filter(segment => segment.value > 0).map(segment => {
          const length = (segment.value / total) * circumference;
          const dash = `${Math.max(0, length - 2)} ${circumference}`;
          const element = <circle key={segment.label} cx="70" cy="70" r={radius} className="donut-segment" stroke={segment.color} strokeDasharray={dash} strokeDashoffset={-offset} />;
          offset += length;
          return element;
        })}
        <text x="70" y="68" className="donut-total">{total}</text>
        <text x="70" y="86" className="donut-caption">{centerLabel}</text>
      </svg>
      <ul className="legend">
        {segments.map(segment => (
          <li key={segment.label}>
            <i style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
            <small>{total ? `${Math.round((segment.value / total) * 100)}%` : '—'}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Point = { date: string; ratio: number; label: string; graded: number; approved: number };

/** Evolución del % de aprobación por entrega, con detalle al pasar por cada punto. */
export function TrendChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 560;
  const height = 190;
  const pad = { top: 16, right: 16, bottom: 26, left: 34 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const y = (ratio: number) => pad.top + (1 - ratio / 100) * innerHeight;
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.ratio).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.top + innerHeight} L${x(0).toFixed(1)},${pad.top + innerHeight} Z`;
  const current = active != null ? points[active] : null;

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución del porcentaje de aprobación por entrega" onMouseLeave={() => setActive(null)}>
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--brand-500)" stopOpacity=".32" />
            <stop offset="1" stopColor="var(--brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map(tick => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="trend-grid" />
            <text x={pad.left - 8} y={y(tick) + 4} className="trend-axis" textAnchor="end">{tick}%</text>
          </g>
        ))}
        <path d={area} fill="url(#trend-fill)" className="trend-area" />
        <path d={line} className="trend-line" pathLength={1} />
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} tabIndex={0} className="trend-point">
            <rect x={x(index) - 14} y={pad.top} width={28} height={innerHeight} fill="transparent" />
            <circle cx={x(index)} cy={y(point.ratio)} r={active === index ? 6 : 4} />
          </g>
        ))}
        <text x={x(0)} y={height - 6} className="trend-axis" textAnchor="start">{formatDate(points[0].date, true)}</text>
        {points.length > 1 && <text x={x(points.length - 1)} y={height - 6} className="trend-axis" textAnchor="end">{formatDate(points[points.length - 1].date, true)}</text>}
      </svg>
      <p className="trend-detail">
        {current
          ? <><strong>{current.label}</strong> · {formatDate(current.date)} · {current.ratio}% aprobado ({current.approved} de {current.graded})</>
          : 'Pasá el cursor por un punto para ver el detalle de la entrega.'}
      </p>
    </div>
  );
}

/** Lista de barras para comparar porcentajes (grupos, temas). */
export function RatioList({ items, threshold }: { items: { key: string | number; label: string; ratio: number | null; hint?: string }[]; threshold: number }) {
  return (
    <ul className="ratio-list">
      {items.map((item, index) => (
        <li key={item.key} style={{ animationDelay: `${index * 45}ms` }}>
          <div className="ratio-head">
            <span>{item.label}</span>
            <strong>{percent(item.ratio)}</strong>
          </div>
          <Progress value={item.ratio} tone={ratioTone(item.ratio, threshold)} />
          {item.hint && <small>{item.hint}</small>}
        </li>
      ))}
    </ul>
  );
}
