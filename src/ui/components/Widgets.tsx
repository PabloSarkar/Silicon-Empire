// Small shared UI pieces. Plain HTML/SVG, styled by styles.css.

import type { ReactNode } from "react";

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
      {label && <span className="progress-label">{label}</span>}
    </div>
  );
}

/** Two-column table of label/value rows. */
export function KeyValue({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <table className="data-table compact key-value">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i}>
            <th>{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "Meets" / "Fails" marker for requirement checks (text, no icons). */
export function Check({ ok }: { ok: boolean }) {
  return <span className={ok ? "ok" : "bad"}>{ok ? "Meets" : "Fails"}</span>;
}

/**
 * Minimal SVG line chart. One series, no animation; axis labels show min/max.
 */
export function LineChart({
  points,
  format,
  height = 120,
}: {
  points: { x: number; y: number }[];
  format: (y: number) => string;
  height?: number;
}) {
  if (points.length < 2) return <p className="muted">Not enough history yet.</p>;
  const width = 560;
  const pad = { left: 70, right: 8, top: 8, bottom: 8 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(...ys, minY + 1);
  const sx = (x: number) => pad.left + ((x - minX) / Math.max(1, maxX - minX)) * (width - pad.left - pad.right);
  const sy = (y: number) => pad.top + (1 - (y - minY) / (maxY - minY)) * (height - pad.top - pad.bottom);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
      <line x1={pad.left} x2={width - pad.right} y1={sy(0)} y2={sy(0)} className="chart-zero" />
      <text x={pad.left - 6} y={pad.top + 4} textAnchor="end" className="chart-label">{format(maxY)}</text>
      <text x={pad.left - 6} y={height - pad.bottom} textAnchor="end" className="chart-label">{format(minY)}</text>
      <path d={d} className="chart-line" />
    </svg>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Progress toward the board's target. A target of zero or less is a maximum allowed loss. */
export function TargetProgress({ profit, target, format }: { profit: number; target: number; format: (n: number) => string }) {
  if (target <= 0) {
    const ok = profit >= target;
    return (
      <p className={ok ? "ok" : "bad"}>
        {ok ? "On track" : "Off track"}: the board accepts a loss of up to {format(-target)} this year.
      </p>
    );
  }
  return <ProgressBar value={Math.max(0, profit)} max={target} label={`${Math.round((Math.max(0, profit) / target) * 100)}% of target`} />;
}
