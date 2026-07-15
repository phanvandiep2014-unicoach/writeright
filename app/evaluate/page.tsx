'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { QuotaBanner, DetailGate } from '@/components/DetailGate';

type Bi = string | { en: string; vi: string };
const tEn = (f: Bi | undefined): string => !f ? '' : typeof f === 'string' ? f : (f.en || '');
const tVi = (f: Bi | undefined): string => !f || typeof f === 'string' ? '' : (f.vi || '');
function BiText({ f, viClass }: { f: Bi | undefined; viClass?: string }) {
const en = tEn(f); const vi = tVi(f);
if (!en && !vi) return null;
return (<span>{en}{vi ? <span className={viClass || 'block text-sm italic text-navy-400 mt-1 font-normal'}>{vi}</span> : null}</span>);
}

const CAT_STYLE: Record<string, { label: string; vi: string; color: string }> = {
grammar: { label: 'Grammar', vi: 'Ngữ pháp', color: '#E06C75' },
vocabulary: { label: 'Vocabulary', vi: 'Từ vựng', color: '#B18CE8' },
register: { label: 'Register', vi: 'Văn phong', color: '#E5C07B' },
tone: { label: 'Tone', vi: 'Sắc thái', color: '#E8975A' },
reference: { label: 'Reference', vi: 'Quy chiếu', color: '#61AFEF' },
dialect: { label: 'Dialect', vi: 'Phương ngữ', color: '#56B6A2' },
spelling: { label: 'Spelling', vi: 'Chính tả', color: '#D678AE' },
};
const catOf = (c?: string) => (c && CAT_STYLE[c]) ? c : 'grammar';

type ErrCorr = { original: string; corrected: string; category?: string; explanation: Bi };
type CriterionResult = { band: number; feedback: Bi; improvements: Bi[] };
type EvalResult = {
overall_band: number;
band_descriptor: string;
headline: Bi;
summary: Bi;
task_achievement: CriterionResult;
lexical_resource: CriterionResult;
grammatical_range: CriterionResult;
coherence_cohesion: CriterionResult;
key_strengths: Bi[];
priority_fixes: Bi[];
error_corrections: ErrCorr[];
model_introduction: string;
model_rewrite?: string;
transcribed_essay?: string;
language_insights?: any;
};

const CRITERIA = [
{ key: 'task_achievement' as const, label: 'Task Achievement', short: 'TA', color: '#7B9FE0', bg: 'rgba(123,159,224,0.12)' },
{ key: 'coherence_cohesion' as const, label: 'Coherence & Cohesion', short: 'CC', color: '#56B6A2', bg: 'rgba(86,182,162,0.12)' },
{ key: 'lexical_resource' as const, label: 'Lexical Resource', short: 'LR', color: '#E06C75', bg: 'rgba(224,108,117,0.12)' },
{ key: 'grammatical_range' as const, label: 'Grammar & Accuracy', short: 'GR', color: '#E5C07B', bg: 'rgba(229,192,123,0.12)' },
];

const LS_PROMPT = 'wr_draft_prompt';
const LS_ESSAY = 'wr_draft_essay';
const MAX_IMAGES = 4;
const MAX_DIM = 1568;

type Img = { data: string; type: string };

/* Downscale + re-encode an image file so payloads stay small (Vercel 4.5MB body limit, Claude vision optimum ~1568px) */
function fileToImg(file: File): Promise<Img> {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => {
const src = reader.result as string;
const img = new Image();
img.onload = () => {
try {
const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
if (scale === 1 && file.size < 1200 * 1024) {
resolve({ data: src.split(',')[1], type: file.type || 'image/png' });
return;
}
const canvas = document.createElement('canvas');
canvas.width = Math.max(1, Math.round(img.width * scale));
canvas.height = Math.max(1, Math.round(img.height * scale));
const ctx = canvas.getContext('2d');
if (!ctx) { resolve({ data: src.split(',')[1], type: file.type || 'image/png' }); return; }
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
const out = canvas.toDataURL('image/jpeg', 0.85);
resolve({ data: out.split(',')[1], type: 'image/jpeg' });
} catch (e) { reject(e); }
};
img.onerror = reject;
img.src = src;
};
reader.onerror = reject;
reader.readAsDataURL(file);
});
}

const imageFilesFromClipboard = (dt: DataTransfer): File[] =>
Array.from(dt.items)
.filter(it => it.kind === 'file' && it.type.startsWith('image/'))
.map(it => it.getAsFile())
.filter(Boolean) as File[];

/* ────────────────────────── Band Ring ────────────────────────── */
function BandRing({ band, size = 128 }: { band: number; size?: number }) {
const r = (size - 10) / 2;
const circ = 2 * Math.PI * r;
const pct = Math.min(band / 9, 1);
return (
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#gold)" strokeWidth="8"
strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
style={{ transition: 'stroke-dasharray 1s ease' }} />
<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stopColor="#8A6A28" /><stop offset="50%" stopColor="#C8A14B" /><stop offset="100%" stopColor="#E7CE8E" />
</linearGradient>
</defs>
</svg>
);
}

/* ────────────────────────── Radar Chart (4 criteria) ────────────────────────── */
function RadarChart({ result }: { result: EvalResult }) {
const size = 240, cx = size / 2, cy = size / 2, R = 82;
const axes = CRITERIA.map((c, i) => ({ ...c, band: result[c.key]?.band ?? 0, angle: -Math.PI / 2 + i * (Math.PI / 2) }));
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
<text x={x} y={y + 12} fontSize="14" fontWeight="700" fill="#E7CE8E">{a.band}</text>
</g>
);
})}
<text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.35)" fontFamily="monospace">/9</text>
</svg>
);
}

/* ────────────────────────── Error category distribution ────────────────────────── */
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
<div className="h-full rounded-full transition-all duration-700" style={{ width: `${(n / max) * 100}%`, background: CAT_STYLE[cat].color }} />
</div>
<span className="w-6 text-base font-bold text-white text-center">{n}</span>
</div>
))}
</div>
);
}

/* ────────────────────────── Highlighted essay ────────────────────────── */
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
<div className="h-full rounded-full transition-all duration-700" style={{ width: `${(band / 9) * 100}%`, background: color }} />
</div>
);
}

export default function EvaluatePage() {
const [taskType, setTaskType] = useState(2);
const [prompt, setPrompt] = useState('');
const [essay, setEssay] = useState('');
const [images, setImages] = useState<Img[]>([]);
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<EvalResult | null>(null);
const [error, setError] = useState('');
const [needsLogin, setNeedsLogin] = useState(false);
const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);
const [activeErr, setActiveErr] = useState<number | null>(null);
const [activeCats, setActiveCats] = useState<Set<string>>(new Set(Object.keys(CAT_STYLE)));
const [showRewrite, setShowRewrite] = useState(false);
const [copied, setCopied] = useState(false);
const fileRef = useRef<HTMLInputElement>(null);
const essayCardRef = useRef<HTMLDivElement>(null);

useEffect(() => {
try {
const savedPrompt = localStorage.getItem(LS_PROMPT);
const savedEssay = localStorage.getItem(LS_ESSAY);
if (savedPrompt) setPrompt(savedPrompt);
if (savedEssay) setEssay(savedEssay);
} catch {}
}, []);

useEffect(() => { try { localStorage.setItem(LS_PROMPT, prompt); } catch {} }, [prompt]);
useEffect(() => { try { localStorage.setItem(LS_ESSAY, essay); } catch {} }, [essay]);

const addImageFiles = useCallback(async (files: File[]) => {
const imgFiles = files.filter(f => f.type.startsWith('image/'));
if (!imgFiles.length) return;
const processed = await Promise.all(imgFiles.slice(0, MAX_IMAGES).map(f => fileToImg(f).catch(() => null)));
const ok = processed.filter(Boolean) as Img[];
if (ok.length) {
setImages(prev => [...prev, ...ok].slice(0, MAX_IMAGES));
setError('');
}
}, []);

// Paste handler for the textareas: grabs pasted image(s), lets pasted text flow into the field as normal.
// Students often paste the Task 1 prompt image together with their essay text in one Ctrl+V.
const handlePaste = (e: React.ClipboardEvent) => {
const files = imageFilesFromClipboard(e.clipboardData);
if (!files.length) return;
addImageFiles(files);
if (!e.clipboardData.getData('text/plain')) e.preventDefault();
};

// Page-level paste: catches Ctrl+V anywhere on the form (outside the textareas)
useEffect(() => {
const onDocPaste = (e: ClipboardEvent) => {
if (result || loading) return;
const dt = e.clipboardData;
if (!dt) return;
const t = e.target as HTMLElement | null;
if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return; // handled by the field's own onPaste
const files = imageFilesFromClipboard(dt);
if (!files.length) return;
addImageFiles(files);
if (!dt.getData('text/plain')) e.preventDefault();
};
document.addEventListener('paste', onDocPaste);
return () => document.removeEventListener('paste', onDocPaste);
}, [result, loading, addImageFiles]);

const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;

const essayForReview = result ? (essay || result.transcribed_essay || '') : '';
const { segments, foundIdx } = useMemo(
() => result && essayForReview ? buildSegments(essayForReview, result.error_corrections || []) : { segments: [], foundIdx: new Set<number>() },
[result, essayForReview]
);

const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
const files = Array.from(e.target.files || []);
if (files.length) addImageFiles(files);
if (fileRef.current) fileRef.current.value = '';
};

const removeImage = (i: number) => setImages(prev => prev.filter((_, j) => j !== i));

const evaluate = async () => {
if (!prompt.trim() && images.length === 0) { setError('Vui lòng nhập đề bài hoặc dán ảnh chụp đề (Ctrl+V)'); return; }
if (!essay.trim() && images.length === 0) { setError('Vui lòng nhập bài luận hoặc dán/tải ảnh bài viết'); return; }
setLoading(true); setError(''); setResult(null); setNeedsLogin(false); setActiveErr(null); setShowRewrite(false);
try {
const res = await fetch('/api/evaluate', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
taskType, taskPrompt: prompt.trim() ? prompt : null,
essayText: essay.trim() ? essay : null,
images: images.length ? images.map(im => ({ data: im.data, media_type: im.type })) : null,
}),
});
const data = await res.json();
if (!res.ok) {
if (data.code === 'AUTH_REQUIRED') { setNeedsLogin(true); return; }
throw new Error(data.error);
}
setResult(data);
try { localStorage.removeItem(LS_PROMPT); localStorage.removeItem(LS_ESSAY); } catch {}
window.scrollTo({ top: 0, behavior: 'smooth' });
} catch (err: any) { setError(err.message); }
finally { setLoading(false); }
};

const reset = () => {
setResult(null); setEssay(''); setPrompt(''); setImages([]);
setExpandedCriterion(null); setNeedsLogin(false); setActiveErr(null); setShowRewrite(false);
try { localStorage.removeItem(LS_PROMPT); localStorage.removeItem(LS_ESSAY); } catch {}
};

// Keep the same prompt + essay so the student can revise using the feedback and resubmit
const rewriteNow = () => {
if (!essay && essayForReview) setEssay(essayForReview);
setResult(null); setActiveErr(null); setShowRewrite(false);
window.scrollTo({ top: 0, behavior: 'smooth' });
};

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

const copyRewrite = () => {
if (result?.model_rewrite) {
navigator.clipboard.writeText(result.model_rewrite);
setCopied(true); setTimeout(() => setCopied(false), 2000);
}
};

const presentCats = useMemo(() => {
if (!result?.error_corrections) return [];
const s = new Set(result.error_corrections.map(e => catOf(e.category)));
return Object.keys(CAT_STYLE).filter(c => s.has(c));
}, [result]);

return (
<div className="min-h-screen">
{/* Header */}
<header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
<div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
<Link href="/" className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-sm">W</div>
<span className="text-lg text-white font-semibold" style={{ fontFamily: 'var(--font-wordmark)' }}>Write<span className="text-brand-400">Right</span></span>
</Link>
<Link href="/dashboard" className="text-sm text-navy-400 hover:text-white transition font-mono">Dashboard →</Link>
</div>
</header>

<main className="max-w-4xl mx-auto px-4 py-8">
<QuotaBanner onUpgrade={() => window.location.href='/pricing'} />

{/* ════════════ LOGIN PROMPT (AUTH_REQUIRED) ════════════ */}
{needsLogin && (
<div className="animate-fade-up bg-navy-800 border border-brand-500/40 rounded-2xl p-8 text-center">
<div className="w-14 h-14 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-3xl mx-auto mb-5">✦</div>
<h2 className="text-xl font-semibold text-white mb-2">Đăng nhập để chấm bài</h2>
<p className="text-navy-300 text-base mb-6 max-w-xs mx-auto leading-relaxed">
Bài luận của bạn đã được lưu. Đăng nhập để tiếp tục nhận kết quả chấm điểm.
</p>
<div className="flex flex-col sm:flex-row gap-3 justify-center">
<Link
href="/login?next=/evaluate"
className="bg-brand-500 text-navy-900 px-8 py-3 rounded-xl font-semibold text-base hover:bg-brand-400 transition shadow-lg shadow-brand-500/20"
>
Đăng nhập với Google
</Link>
<button
onClick={() => setNeedsLogin(false)}
className="border border-navy-600 text-navy-300 px-6 py-3 rounded-xl text-base hover:border-brand-500/40 transition"
>
← Quay lại
</button>
</div>
</div>
)}

{/* ════════════ RESULTS ════════════ */}
{result && (
<div className="animate-fade-up space-y-6">

{/* ── Overall Score Card + Radar ── */}
<div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 relative overflow-hidden">
<div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
<div className="flex items-center gap-8 flex-wrap relative">
<div className="flex-shrink-0 relative">
<BandRing band={result.overall_band} />
<div className="absolute inset-0 flex items-center justify-center flex-col">
<span className="text-5xl font-bold text-brand-400">{result.overall_band}</span>
<span className="text-[10px] font-mono text-navy-500 uppercase tracking-widest">Band</span>
</div>
</div>
<div className="flex-1 min-w-[220px]">
<div className="text-sm font-mono text-brand-500/70 tracking-wider uppercase mb-1">{result.band_descriptor}</div>
<h2 className="text-2xl text-white font-semibold mb-2"><BiText f={result.headline} viClass="block text-base text-navy-400 italic mt-1 font-normal" /></h2>
<p className="text-base text-navy-300 leading-relaxed"><BiText f={result.summary} /></p>
</div>
<div className="flex-shrink-0 mx-auto">
<RadarChart result={result} />
<div className="text-center text-xs font-mono text-navy-500 uppercase tracking-widest -mt-1">Hồ sơ 4 tiêu chí</div>
</div>
</div>

{/* Mini criterion bars */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-navy-700/50">
{CRITERIA.map((c) => {
const d = result[c.key];
return d ? (
<div key={c.key} className="text-center">
<div className="text-2xl font-bold" style={{ color: c.color }}>{d.band}</div>
<div className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-2">{c.label}</div>
<CriterionBar band={d.band} color={c.color} />
</div>
) : null;
})}
</div>
</div>

<DetailGate onUpgrade={() => window.location.href='/pricing'}>

{/* ── Your essay, with colour-coded mistakes ── */}
{essayForReview && (
<div ref={essayCardRef} className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden scroll-mt-20">
<div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3 flex-wrap">
<span className="text-brand-400 text-lg">📝</span>
<div>
<div className="text-lg font-semibold text-white">Bài viết của bạn</div>
<div className="text-sm text-navy-500 italic">Nhấn vào phần được tô màu để xem cách sửa</div>
</div>
<span className="ml-auto text-sm font-mono text-navy-400 bg-navy-700 px-3 py-1 rounded-full">{foundIdx.size} lỗi được đánh dấu</span>
</div>

{/* Legend / category filter */}
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

{/* Active error inspector */}
{activeErr !== null && result.error_corrections?.[activeErr] && (() => {
const e = result.error_corrections[activeErr];
const cat = catOf(e.category);
return (
<div className="mx-6 mt-4 rounded-xl border p-4 animate-fade-up" style={{ borderColor: CAT_STYLE[cat].color + '55', background: CAT_STYLE[cat].color + '12' }}>
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

{/* Essay text with highlights */}
<div className="px-6 py-5">
<p className="whitespace-pre-wrap text-lg leading-9 text-navy-100" style={{ fontFamily: 'Georgia, serif' }}>
{segments.map((s, i) => {
if (s.errIdx === null) return <span key={i}>{s.text}</span>;
const e = result.error_corrections[s.errIdx];
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

{/* ── Criteria Detail Cards ── */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
{CRITERIA.map((c) => {
const d = result[c.key];
if (!d) return null;
const isOpen = expandedCriterion === c.key;
return (
<button key={c.key} onClick={() => setExpandedCriterion(isOpen ? null : c.key)}
className="text-left bg-navy-800 border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20"
style={{ borderColor: isOpen ? c.color : 'rgba(255,255,255,0.08)' }}>
<div className="flex justify-between items-start mb-3">
<span className="inline-block text-xs font-mono tracking-widest uppercase px-2.5 py-1 rounded-full"
style={{ color: c.color, background: c.bg }}>{c.label}</span>
<span className="text-3xl font-bold" style={{ color: c.color }}>{d.band}</span>
</div>
<CriterionBar band={d.band} color={c.color} />
<p className="text-base text-navy-300 leading-relaxed mt-3"><BiText f={d.feedback} /></p>
{isOpen && d.improvements.length > 0 && (
<ul className="mt-4 pt-4 border-t border-navy-700/50 space-y-2.5 list-none">
{d.improvements.map((tip, i) => (
<li key={i} className="text-base text-navy-300 pl-5 relative">
<span className="absolute left-0 font-bold" style={{ color: c.color }}>→</span><BiText f={tip} />
</li>
))}
</ul>
)}
<div className="text-xs font-mono text-navy-500 mt-3">{isOpen ? '▲ Thu gọn' : '▼ Xem gợi ý cải thiện'}</div>
</button>
);
})}
</div>

{/* ── Error Corrections + category chart ── */}
{result.error_corrections?.length > 0 && (
<div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
<div className="px-6 py-4 border-b border-navy-700 flex items-center gap-2">
<span className="text-red-400 text-lg">✏</span>
<span className="text-lg font-semibold text-white">Sửa lỗi chi tiết</span>
<span className="ml-auto text-sm font-mono text-navy-400 bg-navy-700 px-3 py-1 rounded-full">{result.error_corrections.length} lỗi</span>
</div>
<div className="px-6 py-4 border-b border-navy-700/50 bg-navy-900/30">
<div className="text-xs font-mono text-navy-500 uppercase tracking-widest mb-3">Phân bố lỗi theo nhóm</div>
<ErrorCategoryBars errors={result.error_corrections} />
</div>
<div className="divide-y divide-navy-700/50">
{result.error_corrections.map((c, i) => {
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

{/* ── Language Insights ── */}
{result.language_insights && (
<div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
<div className="px-6 py-4 border-b border-navy-700 flex items-center gap-2">
<span className="text-brand-400 text-lg">🔬</span>
<span className="text-lg font-semibold text-white">Language Insights</span>
<span className="text-sm text-navy-500 italic ml-1">Phân tích ngôn ngữ chuyên sâu</span>
</div>
<div className="divide-y divide-navy-700/50">
{[
{ key: 'register', title: 'Register', sub: 'Văn phong', extra: result.language_insights.register?.rating },
{ key: 'tone_nuance', title: 'Tone & Nuance', sub: 'Sắc thái' },
{ key: 'reference_cohesion', title: 'Reference & Cohesion', sub: 'Quy chiếu & Liên kết' },
{ key: 'dialect', title: 'Dialect', sub: 'Phương ngữ', extra: result.language_insights.dialect?.variety },
].map(g => {
const grp = (result.language_insights as any)[g.key];
if (!grp || !grp.notes || grp.notes.length === 0) return null;
return (
<div key={g.key} className="px-6 py-4">
<div className="flex items-center gap-2 mb-3">
<span className="text-base font-semibold text-brand-400">{g.title}</span>
<span className="text-sm text-navy-500 italic">{g.sub}</span>
{g.extra && <span className="ml-auto text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-navy-700 text-navy-300">{g.extra}</span>}
</div>
<ul className="space-y-2.5 list-none">
{grp.notes.map((n: any, i: number) => (
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

{/* ── Strengths + Priority Fixes ── */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div className="bg-navy-800 border border-green-900/40 rounded-2xl p-5">
<div className="flex items-center gap-2 mb-4">
<span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm">✓</span>
<span className="text-sm font-mono tracking-wider uppercase text-green-500">Điểm mạnh</span>
</div>
<ul className="space-y-3 list-none">
{result.key_strengths?.map((s, i) => (
<li key={i} className="text-base text-navy-200 pl-4 border-l-2 border-green-800"><BiText f={s} /></li>
))}
</ul>
</div>
<div className="bg-navy-800 border border-amber-900/40 rounded-2xl p-5">
<div className="flex items-center gap-2 mb-4">
<span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">!</span>
<span className="text-sm font-mono tracking-wider uppercase text-amber-500">Ưu tiên cải thiện</span>
</div>
<ul className="space-y-3 list-none">
{result.priority_fixes?.map((f, i) => (
<li key={i} className="text-base text-navy-200 pl-4 border-l-2 border-amber-800"><BiText f={f} /></li>
))}
</ul>
</div>
</div>

{/* ── Model Introduction ── */}
{result.model_introduction && (
<div className="bg-navy-800 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
<div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-500 to-brand-500/20" />
<div className="flex items-center gap-2 mb-3">
<span className="text-brand-400 text-lg">✦</span>
<span className="text-lg font-semibold text-white">Mở bài mẫu Band 9</span>
<span className="text-xs font-mono text-navy-500 bg-navy-700 px-2.5 py-1 rounded-full ml-auto">Viết riêng cho đề này</span>
</div>
<p className="text-base text-navy-100 leading-relaxed italic pl-3">{result.model_introduction}</p>
</div>
)}

{/* ── Model Rewrite (full essay) ── */}
{result.model_rewrite && (
<div className="bg-gradient-to-b from-navy-800 to-navy-900 border border-brand-500/30 rounded-2xl overflow-hidden">
<div className="px-6 py-4 border-b border-brand-500/20 flex items-center gap-3 flex-wrap">
<span className="text-brand-400 text-xl">👑</span>
<div>
<div className="text-lg font-semibold text-white">Bài của bạn — phiên bản Band 8.5+</div>
<div className="text-sm text-navy-400 italic">Giữ nguyên ý tưởng của bạn, nâng cấp từ vựng, ngữ pháp và liên kết</div>
</div>
<div className="ml-auto flex gap-2">
<button onClick={copyRewrite}
className="text-sm font-mono border border-brand-500/40 text-brand-400 px-4 py-1.5 rounded-full hover:bg-brand-500/10 transition">
{copied ? '✓ Đã sao chép' : '⧉ Sao chép'}
</button>
<button onClick={() => setShowRewrite(!showRewrite)}
className="text-sm font-mono bg-brand-500 text-navy-900 px-4 py-1.5 rounded-full font-semibold hover:bg-brand-400 transition">
{showRewrite ? '▲ Ẩn bài mẫu' : '▼ Xem bài mẫu'}
</button>
</div>
</div>
{showRewrite && (
<div className="px-6 py-5 animate-fade-up">
<p className="whitespace-pre-wrap text-lg leading-9 text-navy-100" style={{ fontFamily: 'Georgia, serif' }}>{result.model_rewrite}</p>
<p className="text-sm text-navy-500 italic mt-4 pt-4 border-t border-navy-700/50">
💡 So sánh từng đoạn với bài gốc của bạn ở trên: chú ý cách nâng cấp từ vựng học thuật, cấu trúc câu phức và từ nối. Sau đó tự viết lại bài — đừng học thuộc.
</p>
</div>
)}
</div>
)}

{/* ── Rewrite CTA ── */}
<div className="bg-navy-800 border-2 border-brand-500/40 rounded-2xl p-6 text-center relative overflow-hidden">
<div className="absolute inset-0 bg-brand-500/5" />
<div className="relative">
<div className="text-2xl mb-2">✍️</div>
<h3 className="text-xl font-semibold text-white mb-2">Viết lại ngay để tăng band!</h3>
<p className="text-base text-navy-300 mb-5 max-w-md mx-auto leading-relaxed">
Áp dụng các gợi ý sửa lỗi ở trên và nộp lại bài — luyện viết lại ngay khi còn nhớ lỗi là cách tăng band nhanh nhất.
</p>
<button onClick={rewriteNow}
className="bg-brand-500 text-navy-900 px-10 py-3.5 rounded-xl text-lg font-semibold hover:bg-brand-400 transition shadow-lg shadow-brand-500/25">
✦ Viết lại bài này ngay
</button>
</div>
</div>

</DetailGate>

{/* ── Action Buttons ── */}
<div className="flex gap-3">
<button onClick={reset} className="flex-1 border border-navy-600 text-navy-300 py-3.5 rounded-xl font-mono text-base hover:border-brand-500/50 transition">
← Chấm bài mới
</button>
<button onClick={() => { navigator.clipboard.writeText(window.location.href); }}
className="px-6 bg-brand-500/15 border border-brand-500/30 text-brand-400 py-3.5 rounded-xl font-mono text-base hover:bg-brand-500/25 transition">
Chia sẻ ↗
</button>
</div>
</div>
)}

{/* ════════════ FORM ════════════ */}
{!result && !loading && !needsLogin && (
<div className="animate-fade-up max-w-3xl mx-auto">
<div className="text-center mb-8">
<div className="text-sm font-mono tracking-widest uppercase text-brand-400 mb-3">Chấm bài Writing</div>
<h1 className="text-3xl text-white font-semibold">Nộp bài luận để chấm điểm</h1>
<p className="text-sm text-navy-400 mt-2">📋 Có thể dán (Ctrl+V) cả ảnh đề bài và bài viết cùng một lúc — ảnh sẽ tự hiện bên dưới</p>
</div>

<div className="mb-5">
<label className="text-sm font-mono tracking-wider uppercase text-brand-400 mb-2 block">Loại bài</label>
<div className="grid grid-cols-2 gap-3">
{[{ n: 2, label: 'Task 2', desc: 'Opinion, discussion, problem/solution' }, { n: 1, label: 'Task 1', desc: 'Graphs, charts, diagrams, maps' }].map((t) => (
<button key={t.n} onClick={() => setTaskType(t.n)} className={`p-4 rounded-xl border-2 text-left transition ${taskType === t.n ? 'border-brand-500 bg-brand-500/10' : 'border-navy-700 bg-navy-800 hover:border-brand-500/30'}`}>
<div className="text-sm font-mono tracking-wider uppercase text-brand-400 mb-1">{t.label}</div>
<div className="text-sm text-navy-400">{t.desc}</div>
</button>
))}
</div>
</div>

<div className="mb-5">
<label className="text-sm font-mono tracking-wider uppercase text-brand-400 mb-2 block">Đề bài</label>
<textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onPaste={handlePaste} placeholder="Dán đề bài IELTS Writing — hoặc dán ảnh chụp đề (Ctrl+V), ví dụ biểu đồ Task 1..."
className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 text-white placeholder-navy-500 focus:border-brand-500 outline-none resize-y min-h-[80px] text-base leading-relaxed" />
</div>

<div className="mb-4">
<label className="text-sm font-mono tracking-wider uppercase text-brand-400 mb-2 block">Bài luận</label>
<textarea value={essay} onChange={(e) => setEssay(e.target.value)} onPaste={handlePaste} placeholder="Dán hoặc nhập bài luận vào đây... Dán kèm ảnh cũng được (ảnh đề, ảnh bài viết tay)."
className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 text-white placeholder-navy-500 focus:border-brand-500 outline-none resize-y min-h-[200px] text-base leading-relaxed" />
<div className={`text-right text-sm font-mono mt-1 ${wordCount < 250 ? 'text-amber-500' : 'text-green-500'}`}>{wordCount} từ</div>
</div>

<div className="mb-4">
<label className="text-sm font-mono tracking-wider uppercase text-brand-400 mb-2 block">Ảnh đính kèm <span className="text-navy-500 normal-case tracking-normal">· đề bài / biểu đồ Task 1 / bài viết tay</span></label>
{images.length > 0 && (
<div className="flex flex-wrap gap-3 mb-3">
{images.map((im, i) => (
<div key={i} className="relative">
<img src={`data:${im.type};base64,${im.data}`} alt={`Ảnh ${i + 1}`} className="h-28 rounded-lg border border-navy-700" />
<button onClick={() => removeImage(i)}
className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow hover:bg-red-400 transition">✕</button>
</div>
))}
</div>
)}
{images.length < MAX_IMAGES && (
<label
onDragOver={(e) => e.preventDefault()}
onDrop={(e) => { e.preventDefault(); addImageFiles(Array.from(e.dataTransfer.files)); }}
className="block border-2 border-dashed border-navy-600 rounded-xl p-5 text-center cursor-pointer hover:border-brand-500/50 bg-navy-800 transition">
<input type="file" accept="image/*" multiple onChange={handleImage} ref={fileRef} className="hidden" />
<p className="text-base text-navy-400">📷 <strong className="text-brand-400">Dán ảnh (Ctrl+V)</strong>, nhấn để tải ảnh, hoặc kéo thả</p>
<p className="text-sm text-navy-600 mt-1">JPG, PNG — tối đa {MAX_IMAGES} ảnh. Ảnh chụp đề bài, biểu đồ Task 1 hoặc bài viết tay</p>
</label>
)}
</div>

{error && <div className="bg-red-900/20 border border-red-800 text-red-300 text-base px-4 py-3 rounded-xl mb-4">{error}</div>}

<button onClick={evaluate} className="w-full bg-brand-500 text-navy-900 py-3.5 rounded-xl text-lg font-semibold hover:bg-brand-400 hover:-translate-y-0.5 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 mt-2">
<span>✦</span> Chấm bài ngay
</button>
</div>
)}

{/* ════════════ LOADING ════════════ */}
{loading && (
<div className="text-center py-16 animate-fade-up">
<div className="w-14 h-14 border-[3px] border-navy-600 border-t-brand-500 rounded-full animate-spin-slow mx-auto mb-6" />
<p className="text-navy-300 italic text-lg">Đang chấm bài của bạn...</p>
<div className="font-mono text-sm text-navy-500 mt-4 space-y-1.5">
{images.length > 0 && <p>Đọc nội dung ảnh đính kèm...</p>}
<p>Phân tích cấu trúc bài luận...</p>
<p>Chấm điểm 4 tiêu chí IELTS...</p>
<p>Đánh dấu lỗi trong bài viết...</p>
<p>Viết lại bài mẫu Band 8.5+...</p>
</div>
</div>
)}
</main>
</div>
);
}
