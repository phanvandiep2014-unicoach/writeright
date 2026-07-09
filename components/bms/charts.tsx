'use client';
// UNICOACH BMS — biểu đồ SVG nhẹ, tương tác, không cần thư viện
import { useState } from 'react';

export const GOLD = '#C8A14B', NAVY = '#11183A', EMERALD = '#34d399', RED = '#f87171', AMBER = '#fbbf24', SKY = '#38bdf8';

// Vòng tròn chuyên cần: segments = [{value,color,label}]
export function Donut({ segments, size = 120, label }: { segments: { value: number; color: string; label: string }[]; size?: number; label?: string }) {
  const total = segments.reduce((t, s) => t + s.value, 0);
  const r = size / 2 - 10, c = size / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  const [hover, setHover] = useState<number | null>(null);
  if (!total) return <div className="text-xs opacity-50 py-4">Chưa có dữ liệu</div>;
  return (
    <div className="inline-flex items-center gap-3">
      <svg width={size} height={size}>
        {segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color}
              strokeWidth={hover === i ? 16 : 12} strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset} transform={`rotate(-90 ${c} ${c})`}
              style={{ transition: 'stroke-width .15s' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <title>{s.label}: {s.value}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x={c} y={c - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">
          {hover != null ? segments[hover].value : total}
        </text>
        <text x={c} y={c + 14} textAnchor="middle" fontSize="9" opacity=".6" fill="currentColor">
          {hover != null ? segments[hover].label : (label || 'buổi')}
        </text>
      </svg>
      <div className="space-y-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs cursor-default"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ opacity: hover == null || hover === i ? 1 : .4, transition: 'opacity .15s' }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.color }} />
            {s.label}: <b>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cột điểm: items = [{label, value, max, sub?}] — hover hiện chi tiết
export function Bars({ items, height = 130, max = 10, color = GOLD, refLine }: {
  items: { label: string; value: number; sub?: string }[]; height?: number; max?: number; color?: string; refLine?: number | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!items.length) return <div className="text-xs opacity-50 py-4">Chưa có dữ liệu</div>;
  const bw = Math.min(44, Math.max(18, Math.floor(320 / items.length)));
  const W = items.length * (bw + 8) + 8, H = height;
  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(W, 200)} height={H + 34}>
        {refLine != null && (
          <>
            <line x1={0} x2={W} y1={H - (refLine / max) * (H - 20) + 10} y2={H - (refLine / max) * (H - 20) + 10}
              stroke={SKY} strokeDasharray="4 3" strokeWidth="1" opacity=".7" />
            <text x={W - 2} y={H - (refLine / max) * (H - 20) + 6} textAnchor="end" fontSize="8" fill={SKY}>TB lớp {refLine}</text>
          </>
        )}
        {items.map((it, i) => {
          const h = Math.max(3, (it.value / max) * (H - 20));
          const x = 8 + i * (bw + 8);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <rect x={x} y={H - h + 10} width={bw} height={h} rx={5}
                fill={color} opacity={hover == null || hover === i ? .95 : .35} style={{ transition: 'opacity .15s' }}>
                <title>{it.label}: {it.value}{it.sub ? ' · ' + it.sub : ''}</title>
              </rect>
              <text x={x + bw / 2} y={H - h + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">
                {it.value}
              </text>
              <text x={x + bw / 2} y={H + 24} textAnchor="middle" fontSize="8" opacity=".55" fill="currentColor">
                {it.label.length > 8 ? it.label.slice(0, 7) + '…' : it.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && <div className="text-xs opacity-70 mt-1">{items[hover].label}{items[hover].sub ? ' — ' + items[hover].sub : ''}</div>}
    </div>
  );
}

// Đường xu hướng (WriteRight band / điểm theo thời gian)
export function Trend({ points, labels, max = 10, width = 300, height = 70, color = GOLD }: {
  points: number[]; labels?: string[]; max?: number; width?: number; height?: number; color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (width - 16) + 8);
  const ys = points.map(p => height - 10 - (p / max) * (height - 20));
  return (
    <div>
      <svg width={width} height={height}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')} />
        {xs.map((x, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={x} cy={ys[i]} r={hover === i ? 5 : 3} fill={color} style={{ transition: 'r .1s' }}>
              <title>{labels?.[i] || ''}: {points[i]}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="text-xs opacity-70 h-4">{hover != null ? `${labels?.[hover] || ''}: ${points[hover]}` : ''}</div>
    </div>
  );
}

export const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
