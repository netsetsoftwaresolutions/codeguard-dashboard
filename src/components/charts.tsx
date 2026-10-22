'use client';

import { cx } from './primitives';
import { useId, useMemo, useState } from 'react';
import { formatDate } from '@/lib/format';

export interface TrendPoint {
  date: string;
  averageScore: number;
  scans: number;
}

/**
 * Single-series line chart of average risk score (0–100) per day. Days without scans are drawn as
 * gaps rather than zeros, so "no data" is never shown as "no risk". Includes a crosshair tooltip and
 * an accessible table view.
 */
export function RiskTrendChart({ points, height = 220 }: { points: TrendPoint[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const width = 640;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const sorted = useMemo(() => [...points].sort((a, b) => a.date.localeCompare(b.date)), [points]);
  const n = sorted.length;
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

  // Build path segments, breaking on days with zero scans.
  const segments: string[] = [];
  let current = '';
  sorted.forEach((p, i) => {
    if (p.scans > 0) {
      current += `${current ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.averageScore).toFixed(1)}`;
    } else if (current) {
      segments.push(current);
      current = '';
    }
  });
  if (current) segments.push(current);

  const ticks = [0, 25, 50, 75, 100];
  const labelIdx = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];
  const hp = hover !== null ? sorted[hover] : null;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={titleId}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          if (n === 0) return;
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          const i = n <= 1 ? 0 : Math.round(((px - pad.left) / innerW) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, i)));
        }}
      >
        <title id={titleId}>Average risk score per day over the last {n} days</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-ink-600" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[10px] dark:fill-slate-400">
              {t}
            </text>
          </g>
        ))}
        {labelIdx.map((i) =>
          sorted[i] ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="fill-slate-500 text-[10px] dark:fill-slate-400">
              {formatDate(sorted[i].date)}
            </text>
          ) : null,
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-brand-600 dark:stroke-brand-400" />
        ))}
        {sorted.map((p, i) =>
          p.scans > 0 ? (
            <circle key={p.date} cx={x(i)} cy={y(p.averageScore)} r={hover === i ? 5 : 2.5} className="fill-brand-600 stroke-white dark:fill-brand-400 dark:stroke-ink-800" strokeWidth={2} />
          ) : null,
        )}
        {hover !== null && hp && (
          <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} className="stroke-slate-400 dark:stroke-slate-500" strokeDasharray="3 3" strokeWidth={1} />
        )}
      </svg>
      {hover !== null && hp && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-ink-500 dark:bg-ink-700"
          style={{ left: `${Math.min(80, Math.max(0, (x(hover) / width) * 100 - 10))}%` }}
        >
          <p className="font-medium text-slate-900 dark:text-white">{formatDate(hp.date)}</p>
          {hp.scans > 0 ? (
            <p className="text-slate-600 dark:text-slate-300">
              Avg risk <span className="font-semibold tabular-nums">{Math.round(hp.averageScore)}</span> · {hp.scans} scan{hp.scans === 1 ? '' : 's'}
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">No scans this day</p>
          )}
        </div>
      )}
      <table className="sr-only">
        <caption>Average risk score per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Average risk score</th>
            <th scope="col">Scans</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{p.scans > 0 ? Math.round(p.averageScore) : 'no data'}</td>
              <td>{p.scans}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Tailwind bg class for the bar. */
  color?: string;
  href?: string;
}

/** Horizontal bar list with value labels; bars are scaled to the max value. */
export function BarList({ items, emptyLabel = 'No data', ariaLabel }: { items: BarItem[]; emptyLabel?: string; ariaLabel: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!items.length || max === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>;
  return (
    <ul className="space-y-2.5" aria-label={ariaLabel}>
      {items.map((it) => (
        <li key={it.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-slate-700 dark:text-slate-300">{it.label}</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{it.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700" aria-hidden="true">
            <div className={cx('h-full rounded-full', it.color ?? 'bg-brand-600')} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Semicircular gauge for a 0–100 risk score. Purely visual; the number is always printed. */
export function ScoreGauge({ score, colorClass }: { score: number; colorClass: string }) {
  const v = Math.max(0, Math.min(100, score));
  const r = 52;
  const c = Math.PI * r;
  return (
    <svg viewBox="0 0 128 72" className="h-auto w-40" aria-hidden="true">
      <path d="M12,64 A52,52 0 0 1 116,64" fill="none" strokeWidth={10} strokeLinecap="round" className="stroke-slate-200 dark:stroke-ink-600" />
      <path
        d="M12,64 A52,52 0 0 1 116,64"
        fill="none"
        strokeWidth={10}
        strokeLinecap="round"
        className={colorClass}
        strokeDasharray={`${(v / 100) * c} ${c}`}
      />
      <text x="64" y="60" textAnchor="middle" className="fill-slate-900 text-[22px] font-semibold dark:fill-white">
        {Math.round(v)}
      </text>
    </svg>
  );
}
