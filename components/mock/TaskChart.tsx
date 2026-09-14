'use client';
// Vẽ lại biểu đồ/sơ đồ Task 1 bằng SVG thuần từ dữ liệu — không dùng ảnh, không thêm thư viện,
// theo đúng phong cách các biểu đồ tự vẽ khác của WriteRight (BandRing, RadarChart trong /evaluate).
import { Task1Item, MapZoneType } from '@/lib/writing-tasks';

const SERIES_COLORS = ['#7B9FE0', '#E5C07B', '#56B6A2', '#E06C75', '#B18CE8'];
const ZONE_COLORS: Record<MapZoneType, string> = {
  park: '#56B6A2', residential: '#7B9FE0', road: '#6B7398', school: '#B18CE8',
  commercial: '#E5C07B', water: '#4A5EA8', industrial: '#E06C75', other: '#3C4670',
};

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-3">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2 text-sm text-navy-300">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function BarChart({ categories, series, unit }: { categories: string[]; series: { name: string; values: number[] }[]; unit?: string }) {
  const W = 640, H = 340, padL = 46, padB = 42, padT = 16, padR = 16;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...series.flatMap(s => s.values)) * 1.15;
  const slotW = plotW / categories.length;
  const barW = Math.min(28, (slotW - 12) / series.length);
  const yTick = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={yTick(t)} y2={yTick(t)} stroke="rgba(255,255,255,0.08)" />
          <text x={padL - 8} y={yTick(t) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.45)" fontFamily="monospace">{t}</text>
        </g>
      ))}
      {categories.map((cat, ci) => {
        const groupW = barW * series.length + (series.length - 1) * 4;
        const x0 = padL + ci * slotW + (slotW - groupW) / 2;
        return (
          <g key={ci}>
            {series.map((s, si) => {
              const v = s.values[ci] || 0;
              const x = x0 + si * (barW + 4);
              const y = yTick(v);
              return <rect key={si} x={x} y={y} width={barW} height={padT + plotH - y} rx="2" fill={SERIES_COLORS[si % SERIES_COLORS.length]} />;
            })}
            <text x={padL + ci * slotW + slotW / 2} y={H - padB + 18} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.6)">{cat}</text>
          </g>
        );
      })}
      {unit && <text x={padL} y={12} fontSize="10" fill="rgba(255,255,255,0.4)" fontFamily="monospace">{unit}</text>}
    </svg>
  );
}

function LineChart({ categories, series, unit }: { categories: string[]; series: { name: string; values: number[] }[]; unit?: string }) {
  const W = 640, H = 340, padL = 46, padB = 34, padT = 16, padR = 16;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const vals = series.flatMap(s => s.values);
  const max = Math.max(...vals) * 1.1 || 1;
  const min = Math.min(0, Math.min(...vals) * 1.1);
  const range = max - min || 1;
  const xAt = (i: number) => padL + (i / Math.max(1, categories.length - 1)) * plotW;
  const yAt = (v: number) => padT + plotH - ((v - min) / range) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(min + range * f));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={yAt(t)} y2={yAt(t)} stroke="rgba(255,255,255,0.08)" />
          <text x={padL - 8} y={yAt(t) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.45)" fontFamily="monospace">{t}</text>
        </g>
      ))}
      {categories.map((cat, i) => (
        <text key={i} x={xAt(i)} y={H - padB + 18} textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,0.6)">{cat}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
        return (
          <g key={si}>
            <polyline points={pts} fill="none" stroke={SERIES_COLORS[si % SERIES_COLORS.length]} strokeWidth="2.5" strokeLinejoin="round" />
            {s.values.map((v, i) => <circle key={i} cx={xAt(i)} cy={yAt(v)} r="3" fill={SERIES_COLORS[si % SERIES_COLORS.length]} />)}
          </g>
        );
      })}
      {unit && <text x={padL} y={12} fontSize="10" fill="rgba(255,255,255,0.4)" fontFamily="monospace">{unit}</text>}
    </svg>
  );
}

function onePie(slices: { label: string; value: number }[], cx: number, cy: number, r: number) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let angle = -Math.PI / 2;
  return slices.map((s, i) => {
    const frac = s.value / total;
    const a0 = angle, a1 = angle + frac * 2 * Math.PI;
    angle = a1;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const d = `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
    return <path key={i} d={d} fill={SERIES_COLORS[i % SERIES_COLORS.length]} stroke="#11183A" strokeWidth="1.5" />;
  });
}

function PieChart({ pies }: { pies: { label: string; slices: { label: string; value: number }[] }[] }) {
  const size = 200, r = 84, cx = size / 2, cy = size / 2;
  const allLabels = Array.from(new Set(pies.flatMap(p => p.slices.map(s => s.label))));
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-8">
        {pies.map((p, pi) => (
          <div key={pi} className="text-center">
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>{onePie(p.slices, cx, cy, r)}</svg>
            <div className="text-sm font-mono text-brand-400 mt-1">{p.label}</div>
          </div>
        ))}
      </div>
      <Legend items={allLabels.map((l, i) => ({ label: l, color: SERIES_COLORS[i % SERIES_COLORS.length] }))} />
    </div>
  );
}

function DataTable({ table }: { table: { headers: string[]; rows: (string | number)[][] } }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 border-b border-navy-600 text-brand-400 font-mono uppercase tracking-wider text-xs whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, ri) => (
            <tr key={ri} className={ri % 2 ? 'bg-navy-900/30' : ''}>
              {r.map((c, ci) => <td key={ci} className="px-3 py-2 border-b border-navy-700/50 text-navy-200 whitespace-nowrap">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProcessDiagram({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-col items-stretch gap-1 max-w-xl mx-auto">
      {steps.map((s, i) => (
        <div key={i}>
          <div className="flex items-center gap-3 bg-navy-900/40 border border-navy-700 rounded-xl px-4 py-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-400 text-sm font-bold flex items-center justify-center">{i + 1}</span>
            <span className="text-sm text-navy-200">{s}</span>
          </div>
          {i < steps.length - 1 && <div className="text-center text-brand-500/60 text-lg leading-none py-0.5">↓</div>}
        </div>
      ))}
    </div>
  );
}

function MapPanel({ label, zones }: { label: string; zones: { name: string; type: MapZoneType; x: number; y: number; w: number; h: number; isNew?: boolean }[] }) {
  const GW = 12, GH = 8, S = 30;
  return (
    <div className="text-center">
      <svg viewBox={`0 0 ${GW * S} ${GH * S}`} width={GW * S} height={GH * S} className="mx-auto border border-navy-700 rounded-lg bg-navy-900/40">
        {zones.map((z, i) => (
          <g key={i}>
            <rect x={z.x * S} y={z.y * S} width={z.w * S} height={z.h * S} fill={ZONE_COLORS[z.type]} fillOpacity={z.isNew ? 0.85 : 0.5}
              stroke={z.isNew ? '#C8A14B' : 'rgba(255,255,255,0.25)'} strokeWidth={z.isNew ? 2.5 : 1} strokeDasharray={z.isNew ? '0' : '0'} rx="2" />
            <text x={z.x * S + (z.w * S) / 2} y={z.y * S + (z.h * S) / 2} textAnchor="middle" dominantBaseline="middle"
              fontSize="9.5" fill="#fff" style={{ pointerEvents: 'none' }}>{z.name}{z.isNew ? ' ✦' : ''}</text>
          </g>
        ))}
      </svg>
      <div className="text-sm font-mono text-brand-400 mt-1.5">{label}</div>
    </div>
  );
}

function MapSchematic({ mapPanels }: { mapPanels: { label: string; zones: any[] }[] }) {
  const types = Array.from(new Set(mapPanels.flatMap(p => p.zones.map((z: any) => z.type)))) as MapZoneType[];
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-6">
        {mapPanels.map((p, i) => <MapPanel key={i} label={p.label} zones={p.zones} />)}
      </div>
      <Legend items={types.map(t => ({ label: t, color: ZONE_COLORS[t] }))} />
      <p className="text-xs text-navy-500 text-center mt-2 italic">✦ = khu vực mới hoặc thay đổi so với mốc thời gian trước</p>
    </div>
  );
}

export default function TaskVisual({ task }: { task: Task1Item }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5">
      <div className="text-center text-base font-semibold text-white mb-4">{task.title}</div>
      {task.chartType === 'bar' && task.categories && task.series && <BarChart categories={task.categories} series={task.series} unit={task.unit} />}
      {task.chartType === 'line' && task.categories && task.series && <LineChart categories={task.categories} series={task.series} unit={task.unit} />}
      {task.chartType === 'pie' && task.pies && <PieChart pies={task.pies} />}
      {task.chartType === 'table' && task.table && <DataTable table={task.table} />}
      {task.chartType === 'process' && task.steps && <ProcessDiagram steps={task.steps} />}
      {task.chartType === 'map' && task.mapPanels && <MapSchematic mapPanels={task.mapPanels} />}
    </div>
  );
}
