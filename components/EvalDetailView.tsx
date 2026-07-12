'use client';
import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';

// Interactive evaluation detail view — shared by /e/[token]
// Mirrors the /evaluate results UI: highlighted essay, radar chart, category bars, model rewrite

type Bi = string | { en: string; vi: string };
const tEn = (f: Bi | undefined): string => !f ? '' : typeof f === 'string' ? f : (f.en || '');
const tVi = (f: Bi | undefined): string => !f || typeof f === 'string' ? '' : (f.vi || '');
function BiText({ f, viClass }: { f: Bi | undefined; viClass?: string }) {
  const en = tEn(f); const vi = tVi(f);
  if (!en && !vi) return null;
  return (<span>{en}{vi ? <span className={viClass || 'block text-sm italic text-navy-400 mt-1 font-normal'}>{vi}</span> : null}</span>);
}

const CAT_STYLE: Record<string, { label: string; vi: string; color: string }> = {
  grammar:    { label: 'Grammar',    vi: 'Ngữ pháp',    color: '#E06C75' },
  vocabulary: { label: 'Vocabulary', vi: 'Từ vựng',     color: '#B18CE8' },
    register:   { label: 'Register',   vi: 'Văn phong',   color: '#E5C07B' },
  tone:       { label: 'Tone',       vi: 'Sắc thái',    color: '#E8975A' },
  reference:  { label: 'Reference',  vi: 'Quy chiếu',   color: '#61AFEF' },
  dialect:    { label: 'Dialect',    vi: 'Phương ngữ',  color: '#56B6A2' },
  spelling:   { label: 'Spelling',   vi: 'Chính tả',    color: '#D678AE' },
};
const catOf = (c?: string) => (c && CAT_STYLE[c]) ? c : 'grammar';

type ErrCorr = { original: string; corrected: string; category?: string; explanation: Bi };

const CRITERIA = [
  { key: 'task_achievement', label: 'Task Achievement', short: 'TA', color: '#7B9FE0', bg: 'rgba(123,159,224,0.12)', bandKey: 'ta_band' },
  { key: 'coherence_cohesion', label: 'Coherence & Cohesion', short: 'CC', color: '#56B6A2', bg: 'rgba(86,182,162,0.12)', bandKey: 'cc_band' },
  { key: 'lexical_resource', label: 'Lexical Resource', short: 'LR', color: '#E06C75', bg: 'rgba(224,108,117,0.12)', bandKey: 'lr_band' },
  { key: 'grammatical_range', label: 'Grammar & Accuracy', short: 'GR', color: '#E5C07B', bg: 'rgba(229,192,123,0.12)', bandKey: 'gra_band' },
];

function BandRing({ band, size = 116 }: { band: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(band / 9, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#goldShare)" strokeWidth="8"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <defs>
        <linearGradient id="goldShare" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8A6A28" /><stop offset="50%" stopColor="#C8A14B" /><stop offset="100%" stopColor="#E7CE8E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function RadarChart({ bands }: { bands: number[] }) {
  const size = 230, cx = size / 2, cy = size / 2, R = 76;
  const axes = CRITERIA.map((c, i) => ({ ...c, band: bands[i] ?? 0, angle: -Math.PI / 2 + i * (Math.PI / 2) }));
  const pt = (r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const poly = axes.map(a => pt(R * (a.band / 9), a.angle).join(',')).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block mx-auto">
      {[3, 5, 7, 9].map(g => (
        <polygon key={g} points={axes.map(a => pt(R * (g / 9), a.angle).join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
      ))}
      {axes.map((a, i) => { const [x, y] = pt(R, a.angle); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />; })}
      <polygon points={poly} fill="rgba(200,161,75,0.25)" stroke="#C8A14B" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => { const [x, y] = pt(R * (a.band / 9), a.angle); return <circle key={i} cx={x} cy={y} r="4" fill={a.color} stroke="#11183A" strokeWidth="1.5" />; })}
      {axes.map((a, i) => {
        const [x, y] = pt(R + 26, a.angle);
        return (
          <g key={i} textAnchor="middle">
            <text x={x} y={y - 4} fontSize="12" fontWeight="700" fill={a.color} fontFamily="monospace">{a.short}</text>
            <text x={x} y={y + 12} fontSize="14" fontWeight="700" fill="#E7CE8E">{a.band || '—'}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ErrorCategoryBars({ errors }: { errors: ErrCorr[] }) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    errors.forEach(e => { const c = catOf(e.category); m[c] = (m[c] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [errors]);
  if (!counts.length) return null;
  const max = counts[0][1];
  return (
    <div className="space-y-2">
      {counts.map(([cat, n]) => (
        <div key={cat} className="flex items-center gap-3">
          <span className="w-24 flex-shrink-0 text-sm font-semibold text-right" style={{ color: CAT_STYLE[cat].color }}>{CAT_STYLE[cat].label}</span>
          <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: CAT_STYLE[cat].color }} />
          </div>
          <span className="w-6 text-base font-bold text-white text-center">{n}</span>
        </div>
      ))}
    </div>
  );
}

type Segment = { text: string; errIdx: number | null };
function buildSegments(essay: string, errors: ErrCorr[]): { segments: Segment[]; foundIdx: Set<number> } {
  const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase();
  const hay = norm(essay);
  const matches: { start: number; end: number; errIdx: number }[] = [];
  errors.forEach((e, i) => {
    const needle = norm((e.original || '').trim());
    if (!needle || needle.length < 2) return;
    let from = 0;
    while (from < hay.length) {
      const at = hay.indexOf(needle, from);
      if (at === -1) break;
      const overlaps = matches.some(m => at < m.end && at + needle.length > m.start);
      if (!overlaps) { matches.push({ start: at, end: at + needle.length, errIdx: i }); break; }
      from = at + 1;
    }
  });
  matches.sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  const foundIdx = new Set<number>();
  let cursor = 0;
  matches.forEach(m => {
    if (m.start > cursor) segments.push({ text: essay.slice(cursor, m.start), errIdx: null });
    segments.push({ text: essay.slice(m.start, m.end), errIdx: m.errIdx });
    foundIdx.add(m.errIdx);
    cursor = m.end;
  });
  if (cursor < essay.length) segments.push({ text: essay.slice(cursor), errIdx: null });
  return { segments, foundIdx };
}

function CriterionBar({ band, color }: { band: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${(band / 9) * 100}%`, background: color }} />
    </div>
  );
}

export default function EvalDetailView({ row }: { row: any }) {
  const fb = (row.feedback || {}) as any;
  const overall = row.overall_band ?? fb?.overall_band ?? 0;
  const errors: ErrCorr[] = fb?.error_corrections || [];
  const essayText: string = row.essay_text || fb?.transcribed_essay || '';

  const [activeErr, setActiveErr] = useState<number | null>(null);
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set(Object.keys(CAT_STYLE)));
  const [showRewrite, setShowRewrite] = useState(false);
  const essayCardRef = useRef<HTMLDivElement>(null);

  const { segments, foundIdx } = useMemo(
    () => essayText ? buildSegments(essayText, errors) : { segments: [] as Segment[], foundIdx: new Set<number>() },
    [essayText, errors]
  );

  const presentCats = useMemo(() => {
    const s = new Set(errors.map(e => catOf(e.category)));
    return Object.keys(CAT_STYLE).filter(c => s.has(c));
  }, [errors]);

  const bands = CRITERIA.map(c => row[c.bandKey] ?? fb?.[c.key]?.band ?? 0);

  const toggleCat = (cat: string) => {
    setActiveCats(prev => {
      const next = new Set(prev);
            if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
    setActiveErr(null);
  };

  const jumpToErr = (i: number) => {
    setActiveErr(i);
    essayCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

            {/* ── Sharer + Overall score + Radar ── */}
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-4 mb-5 relative">
          {row.sharer_avatar
            ? <img src={row.sharer_avatar} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full border border-navy-600 object-cover shrink-0" />
            : <div className="w-14 h-14 rounded-full bg-brand-500/20 border border-navy-600 flex items-center justify-center text-brand-400 font-bold text-xl shrink-0">
                {(row.sharer_name || '?').charAt(0).toUpperCase()}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-lg">{row.sharer_name || 'IELTS Writer'}</p>
            <p className="text-sm font-mono text-navy-500 mt-0.5">
              Task {row.task_type} · {row.word_count} từ · {new Date(row.created_at).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8 flex-wrap relative">
          <div className="flex-shrink-0 relative">
            <BandRing band={overall} />
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-4xl font-bold text-brand-400">{overall}</span>
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-widest">Band</span>
            </div>
          </div>
          <div className="flex-1 min-w-[220px]">
            {fb?.band_descriptor && <div className="text-sm font-mono text-brand-500/70 tracking-wider uppercase mb-1">{fb.band_descriptor}</div>}
            {fb?.headline && <h2 className="text-2xl text-white font-semibold mb-2"><BiText f={fb.headline} viClass="block text-base text-navy-400 italic mt-1 font-normal" /></h2>}
            {fb?.summary && <p className="text-base text-navy-300 leading-relaxed"><BiText f={fb.summary} /></p>}
          </div>
          <div className="flex-shrink-0 mx-auto">
            <RadarChart bands={bands} />
            <div className="text-center text-xs font-mono text-navy-500 uppercase tracking-widest -mt-1">Hồ sơ 4 tiêu chí</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-navy-700/50">
          {CRITERIA.map((c, i) => (
            <div key={c.key} className="text-center">
              <div className="text-2xl font-bold" style={{ color: c.color }}>{bands[i] || '—'}</div>
              <div className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-2">{c.label}</div>
              <CriterionBar band={bands[i]} color={c.color} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Task prompt ── */}
      {row.task_prompt && (
        <div className="bg-navy-800 border border-navy-700 rounded-2xl px-6 py-4">
          <p className="text-xs font-mono text-navy-400 uppercase tracking-widest mb-2">Đề bài</p>
          <p className="text-base text-navy-200 leading-relaxed">{row.task_prompt}</p>
        </div>
      )}

      {/* ── Essay with colour-coded mistakes ── */}
      {essayText && (
        <div ref={essayCardRef} className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden scroll-mt-20">
          <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3 flex-wrap">
            <span className="text-brand-400 text-lg">📝</span>
            <div>
              <div className="text-lg font-semibold text-white">Bài viết</div>
              <div className="text-sm text-navy-500 italic">Nhấn vào phần được tô màu để xem cách sửa</div>
            </div>
            <span className="ml-auto text-sm font-mono text-navy-400 bg-navy-700 px-3 py-1 rounded-full">{foundIdx.size} lỗi được đánh dấu</span>
          </div>

          {presentCats.length > 0 && (
            <div className="px-6 py-3 border-b border-navy-700/50 flex flex-wrap gap-2">
              {presentCats.map(cat => {
                const on = activeCats.has(cat);
                return (
                  <button key={cat} onClick={() => toggleCat(cat)}
                    className="text-sm font-semibold px-3 py-1.5 rounded-full border transition"
                    style={{
                      color: on ? CAT_STYLE[cat].color : 'rgba(255,255,255,0.25)',
                      borderColor: on ? CAT_STYLE[cat].color + '66' : 'rgba(255,255,255,0.1)',
                      background: on ? CAT_STYLE[cat].color + '1A' : 'transparent',
                    }}>
                    ● {CAT_STYLE[cat].label} <span className="opacity-60 font-normal">· {CAT_STYLE[cat].vi}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeErr !== null && errors[activeErr] && (() => {
            const e = errors[activeErr];
            const cat = catOf(e.category);
            return (
              <div className="mx-6 mt-4 rounded-xl border p-4" style={{ borderColor: CAT_STYLE[cat].color + '55', background: CAT_STYLE[cat].color + '12' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: CAT_STYLE[cat].color, background: CAT_STYLE[cat].color + '22' }}>{CAT_STYLE[cat].label} · {CAT_STYLE[cat].vi}</span>
                  <button onClick={() => setActiveErr(null)} className="ml-auto text-navy-500 hover:text-white transition text-lg leading-none">✕</button>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-base mb-2">
                  <span className="line-through text-red-400/90">{e.original}</span>
                  <span className="text-navy-500">→</span>
                  <span className="text-green-400 font-semibold">{e.corrected}</span>
                </div>
                <p className="text-sm text-navy-300"><BiText f={e.explanation} /></p>
              </div>
            );
          })()}

          <div className="px-6 py-5">
            <p className="whitespace-pre-wrap text-lg leading-9 text-navy-100" style={{ fontFamily: 'Georgia, serif' }}>
              {segments.map((s, i) => {
                if (s.errIdx === null) return <span key={i}>{s.text}</span>;
                const e = errors[s.errIdx];
                const cat = catOf(e?.category);
                const on = activeCats.has(cat);
                const isActive = activeErr === s.errIdx;
                if (!on) return <span key={i}>{s.text}</span>;
                return (
                  <mark key={i} onClick={() => setActiveErr(isActive ? null : s.errIdx)}
                    title={`${e.original} → ${e.corrected}`}
                    className="cursor-pointer rounded px-1 transition"
                    style={{
                      background: CAT_STYLE[cat].color + (isActive ? '55' : '26'),
                      borderBottom: `3px solid ${CAT_STYLE[cat].color}`,
                      color: '#fff',
                      boxShadow: isActive ? `0 0 0 2px ${CAT_STYLE[cat].color}88` : 'none',
                    }}>
                    {s.text}
                  </mark>
                );
              })}
            </p>
          </div>
        </div>
      )}

      {/* ── Criteria detail ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CRITERIA.map((c, idx) => {
          const d = fb?.[c.key];
          if (!d) return null;
          return (
            <div key={c.key} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-block text-xs font-mono tracking-widest uppercase px-2.5 py-1 rounded-full"
                  style={{ color: c.color, background: c.bg }}>{c.label}</span>
                <span className="text-3xl font-bold" style={{ color: c.color }}>{bands[idx] || d.band || '—'}</span>
              </div>
              <CriterionBar band={bands[idx] || d.band || 0} color={c.color} />
              {d.feedback && <p className="text-base text-navy-300 leading-relaxed mt-3"><BiText f={d.feedback} /></p>}
              {d.improvements?.length > 0 && (
                <ul className="mt-4 pt-4 border-t border-navy-700/50 space-y-2.5 list-none">
                  {d.improvements.map((tip: Bi, i: number) => (
                    <li key={i} className="text-base text-navy-300 pl-5 relative">
                      <span className="absolute left-0 font-bold" style={{ color: c.color }}>→</span><BiText f={tip} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Error corrections + category chart ── */}
      {errors.length > 0 && (
        <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-2">
            <span className="text-red-400 text-lg">✏</span>
            <span className="text-lg font-semibold text-white">Sửa lỗi chi tiết</span>
            <span className="ml-auto text-sm font-mono text-navy-400 bg-navy-700 px-3 py-1 rounded-full">{errors.length} lỗi</span>
          </div>
          <div className="px-6 py-4 border-b border-navy-700/50 bg-navy-900/30">
            <div className="text-xs font-mono text-navy-500 uppercase tracking-widest mb-3">Phân bố lỗi theo nhóm</div>
            <ErrorCategoryBars errors={errors} />
          </div>
          <div className="divide-y divide-navy-700/50">
            {errors.map((c, i) => {
              const cat = catOf(c.category);
              return (
                <div key={i} onClick={() => foundIdx.has(i) && jumpToErr(i)}
                  className={`px-6 py-4 transition ${foundIdx.has(i) ? 'cursor-pointer hover:bg-white/[0.03]' : ''} ${activeErr === i ? 'bg-white/[0.04]' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: CAT_STYLE[cat].color, background: CAT_STYLE[cat].color + '22' }}>{CAT_STYLE[cat].label}</span>
                    {foundIdx.has(i) && <span className="text-xs text-navy-500 font-mono">↑ xem trong bài</span>}
                  </div>
                  <div className="flex items-start gap-3 flex-wrap mb-1.5 text-base">
                    <span className="text-red-400/90 line-through">{c.original}</span>
                    <span className="text-navy-600">→</span>
                    <span className="text-green-400 font-semibold">{c.corrected}</span>
                  </div>
                  <p className="text-sm text-navy-400 italic"><BiText f={c.explanation} /></p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Language insights ── */}
      {fb?.language_insights && (
        <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-2">
            <span className="text-brand-400 text-lg">🔬</span>
            <span className="text-lg font-semibold text-white">Language Insights</span>
            <span className="text-sm text-navy-500 italic ml-1">Phân tích ngôn ngữ chuyên sâu</span>
          </div>
          <div className="divide-y divide-navy-700/50">
            {[
                            { key: 'register', title: 'Register', sub: 'Văn phong', extra: fb.language_insights.register?.rating },
              { key: 'tone_nuance', title: 'Tone & Nuance', sub: 'Sắc thái' },
              { key: 'reference_cohesion', title: 'Reference & Cohesion', sub: 'Quy chiếu & Liên kết' },
              { key: 'dialect', title: 'Dialect', sub: 'Phương ngữ', extra: fb.language_insights.dialect?.variety },
            ].map(g => {
              const grp = fb.language_insights[g.key];
              if (!grp?.notes?.length) return null;
              return (
                <div key={g.key} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base font-semibold text-brand-400">{g.title}</span>
                    <span className="text-sm text-navy-500 italic">{g.sub}</span>
                    {g.extra && <span className="ml-auto text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-navy-700 text-navy-300">{g.extra}</span>}
                  </div>
                  <ul className="space-y-2.5 list-none">
                    {grp.notes.map((n: Bi, i: number) => (
                      <li key={i} className="text-base text-navy-300 pl-5 relative leading-relaxed">
                        <span className="absolute left-0 text-brand-500">•</span><BiText f={n} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Strengths + Priority fixes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fb?.key_strengths?.length > 0 && (
          <div className="bg-navy-800 border border-green-900/40 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm">✓</span>
              <span className="text-sm font-mono tracking-wider uppercase text-green-500">Điểm mạnh</span>
            </div>
            <ul className="space-y-3 list-none">
              {fb.key_strengths.map((s: Bi, i: number) => (
                <li key={i} className="text-base text-navy-200 pl-4 border-l-2 border-green-800"><BiText f={s} /></li>
              ))}
            </ul>
          </div>
        )}
        {fb?.priority_fixes?.length > 0 && (
          <div className="bg-navy-800 border border-amber-900/40 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">!</span>
              <span className="text-sm font-mono tracking-wider uppercase text-amber-500">Ưu tiên cải thiện</span>
            </div>
            <ul className="space-y-3 list-none">
              {fb.priority_fixes.map((f: Bi, i: number) => (
                <li key={i} className="text-base text-navy-200 pl-4 border-l-2 border-amber-800"><BiText f={f} /></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Model introduction ── */}
      {fb?.model_introduction && (
        <div className="bg-navy-800 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-500 to-brand-500/20" />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-brand-400 text-lg">✦</span>
            <span className="text-lg font-semibold text-white">Mở bài mẫu Band 9</span>
          </div>
          <p className="text-base text-navy-100 leading-relaxed italic pl-3">{fb.model_introduction}</p>
        </div>
      )}

      {/* ── Model rewrite ── */}
      {fb?.model_rewrite && (
        <div className="bg-gradient-to-b from-navy-800 to-navy-900 border border-brand-500/30 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-500/20 flex items-center gap-3 flex-wrap">
            <span className="text-brand-400 text-xl">👑</span>
            <div>
              <div className="text-lg font-semibold text-white">Bài viết — phiên bản Band 8.5+</div>
              <div className="text-sm text-navy-400 italic">Giữ nguyên ý tưởng, nâng cấp từ vựng, ngữ pháp và liên kết</div>
            </div>
            <button onClick={() => setShowRewrite(!showRewrite)}
              className="ml-auto text-sm font-mono bg-brand-500 text-navy-900 px-4 py-1.5 rounded-full font-semibold hover:bg-brand-400 transition">
              {showRewrite ? '▲ Ẩn bài mẫu' : '▼ Xem bài mẫu'}
            </button>
          </div>
          {showRewrite && (
            <div className="px-6 py-5">
              <p className="whitespace-pre-wrap text-lg leading-9 text-navy-100" style={{ fontFamily: 'Georgia, serif' }}>{fb.model_rewrite}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Band-up plan ── */}
      {CRITERIA.some(c => (fb?.[c.key]?.improvements?.length ?? 0) > 0) && (
        <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-2">
            <span className="text-brand-400 text-lg">🎯</span>
            <span className="text-lg font-semibold text-white">Kế hoạch nâng band lần sau</span>
            <span className="text-sm text-navy-500 italic ml-1">Band-up Plan</span>
          </div>
          <div className="px-6 py-4 space-y-5">
            {CRITERIA.map((c, idx) => {
              const d = fb?.[c.key];
              if (!d?.improvements?.length) return null;
              return (
                <div key={'plan-' + c.key}>
                  <p className="text-base font-semibold mb-2" style={{ color: c.color }}>{c.label}{(bands[idx] || d.band) ? ` — hiện tại ${bands[idx] || d.band}` : ''}</p>
                  <ul className="space-y-2 list-none">
                    {d.improvements.map((tip: Bi, i: number) => (
                      <li key={i} className="text-base text-navy-300 pl-5 relative"><span className="absolute left-0 font-bold" style={{ color: c.color }}>→</span><BiText f={tip} /></li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <p className="text-sm text-navy-500 pt-3 border-t border-navy-700/50">Học viên nên áp dụng các gợi ý trên trong bài viết tiếp theo để cải thiện band điểm. Phụ huynh có thể theo dõi tiến bộ qua các phiếu chấm được chia sẻ.</p>
          </div>
        </div>
      )}

      <div className="mt-4 text-center">
        <Link href="/evaluate" className="inline-block px-8 py-3.5 rounded-xl bg-brand-500 text-navy-900 font-semibold text-lg hover:bg-brand-400 transition shadow-lg shadow-brand-500/25">
          ✦ Chấm bài của bạn →
        </Link>
      </div>
    </main>
  );
}
