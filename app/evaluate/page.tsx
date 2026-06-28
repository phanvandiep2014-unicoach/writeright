'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { QuotaBanner, DetailGate } from '@/components/DetailGate';

type CriterionResult = { band: number; feedback: string; improvements: string[] };
type EvalResult = {
  overall_band: number;
  band_descriptor: string;
  headline: string;
  summary: string;
  task_achievement: CriterionResult;
  lexical_resource: CriterionResult;
  grammatical_range: CriterionResult;
  coherence_cohesion: CriterionResult;
  key_strengths: string[];
  priority_fixes: string[];
  error_corrections: { original: string; corrected: string; explanation: string }[];
  model_introduction: string;
};

const CRITERIA = [
  { key: 'task_achievement' as const, label: 'Task Achievement', short: 'TA', color: '#4A6FA5', bg: 'rgba(74,111,165,0.12)', border: 'rgba(74,111,165,0.3)' },
  { key: 'coherence_cohesion' as const, label: 'Coherence & Cohesion', short: 'CC', color: '#3D8567', bg: 'rgba(61,133,103,0.12)', border: 'rgba(61,133,103,0.3)' },
  { key: 'lexical_resource' as const, label: 'Lexical Resource', short: 'LR', color: '#9173B8', bg: 'rgba(145,115,184,0.12)', border: 'rgba(145,115,184,0.3)' },
  { key: 'grammatical_range' as const, label: 'Grammar & Accuracy', short: 'GR', color: '#B5495C', bg: 'rgba(181,73,92,0.12)', border: 'rgba(181,73,92,0.3)' },
];

function BandRing({ band, size = 96 }: { band: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(band / 9, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#gold)" strokeWidth="6"
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

function CriterionBar({ band, color }: { band: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(band / 9) * 100}%`, background: color }} />
    </div>
  );
}

export default function EvaluatePage() {
  const [taskType, setTaskType] = useState(2);
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageType, setImageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState('');
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageData(dataUrl.split(',')[1]);
      setImageType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const evaluate = async () => {
    if (!prompt) { setError('Vui lÃ²ng nháº­p Äá» bÃ i'); return; }
    if (tab === 'text' && !essay) { setError('Vui lÃ²ng nháº­p bÃ i luáº­n'); return; }
    if (tab === 'image' && !imageData) { setError('Vui lÃ²ng táº£i áº£nh bÃ i viáº¿t'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType, taskPrompt: prompt,
          essayText: tab === 'text' ? essay : null,
          imageBase64: tab === 'image' ? imageData : null,
          imageType: tab === 'image' ? imageType : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setEssay(''); setPrompt(''); setImageData(null); setExpandedCriterion(null); };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-sm">W</div>
            <span className="text-lg text-white font-semibold" style={{ fontFamily: 'var(--font-wordmark)' }}>Write<span className="text-brand-400">Right</span></span>
          </Link>
          <Link href="/dashboard" className="text-sm text-navy-400 hover:text-white transition font-mono">Dashboard â</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <QuotaBanner onUpgrade={() => window.location.href='/pricing'} />

        {/* ââââââââââââ RESULTS ââââââââââââ */}
        {result && (
          <div className="animate-fade-up space-y-5">

            {/* ââ Overall Score Card ââ */}
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="flex items-center gap-6 flex-wrap relative">
                <div className="flex-shrink-0 relative">
                  <BandRing band={result.overall_band} />
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-brand-400">{result.overall_band}</span>
                    <span className="text-[9px] font-mono text-navy-500 uppercase tracking-widest">Band</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs font-mono text-brand-500/70 tracking-wider uppercase mb-1">{result.band_descriptor}</div>
                  <h2 className="text-xl text-white font-semibold mb-1">{result.headline}</h2>
                  <p className="text-sm text-navy-300 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Mini criterion bars */}
              <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-navy-700/50">
                {CRITERIA.map((c) => {
                  const d = result[c.key];
                  return d ? (
                    <div key={c.key} className="text-center">
                      <div className="text-lg font-bold" style={{ color: c.color }}>{d.band}</div>
                      <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1.5">{c.short}</div>
                      <CriterionBar band={d.band} color={c.color} />
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <DetailGate onUpgrade={() => window.location.href='/pricing'}>

            {/* ââ Criteria Detail Cards ââ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CRITERIA.map((c) => {
                const d = result[c.key];
                if (!d) return null;
                const isOpen = expandedCriterion === c.key;
                return (
                  <button key={c.key} onClick={() => setExpandedCriterion(isOpen ? null : c.key)}
                    className="text-left bg-navy-800 border rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-black/20"
                    style={{ borderColor: isOpen ? c.color : 'rgba(255,255,255,0.08)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full mb-1.5"
                          style={{ color: c.color, background: c.bg }}>{c.label}</span>
                      </div>
                      <span className="text-2xl font-bold" style={{ color: c.color }}>{d.band}</span>
                    </div>
                    <CriterionBar band={d.band} color={c.color} />
                    <p className="text-xs text-navy-300 leading-relaxed mt-3">{d.feedback}</p>
                    {isOpen && d.improvements.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-navy-700/50 space-y-1.5">
                        {d.improvements.map((tip, i) => (
                          <p key={i} className="text-xs text-navy-400 pl-4 relative">
                            <span className="absolute left-0" style={{ color: c.color }}>â</span>{tip}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-navy-600 mt-2">{isOpen ? 'â² Thu gá»n' : 'â¼ Xem chi tiáº¿t'}</div>
                  </button>
                );
              })}
            </div>

            {/* ââ Error Corrections ââ */}
            {result.error_corrections?.length > 0 && (
              <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-navy-700 flex items-center gap-2">
                  <span className="text-red-400">â</span>
                  <span className="text-sm font-semibold text-white">Sá»­a lá»i chi tiáº¿t</span>
                  <span className="ml-auto text-[10px] font-mono text-navy-500 bg-navy-700 px-2 py-0.5 rounded-full">{result.error_corrections.length} lá»i</span>
                </div>
                <div className="divide-y divide-navy-700/50">
                  {result.error_corrections.map((c, i) => (
                    <div key={i} className="px-5 py-3 hover:bg-navy-750/30 transition">
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start mb-1">
                        <span className="font-mono text-xs text-red-400/80 line-through">{c.original}</span>
                        <span className="text-navy-600 text-xs">â</span>
                        <span className="font-mono text-xs text-green-400">{c.corrected}</span>
                      </div>
                      <p className="text-[11px] text-navy-500 italic">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ââ Strengths + Priority Fixes ââ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-navy-800 border border-green-900/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs">â</span>
                  <span className="text-xs font-mono tracking-wider uppercase text-green-500">Äiá»m máº¡nh</span>
                </div>
                <div className="space-y-2">
                  {result.key_strengths?.map((s, i) => (
                    <p key={i} className="text-sm text-navy-200 pl-3 border-l-2 border-green-800">{s}</p>
                  ))}
                </div>
              </div>
              <div className="bg-navy-800 border border-amber-900/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">!</span>
                  <span className="text-xs font-mono tracking-wider uppercase text-amber-500">Æ¯u tiÃªn cáº£i thiá»n</span>
                </div>
                <div className="space-y-2">
                  {result.priority_fixes?.map((f, i) => (
                    <p key={i} className="text-sm text-navy-200 pl-3 border-l-2 border-amber-800">{f}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* ââ Model Introduction ââ */}
            {result.model_introduction && (
              <div className="bg-navy-800 border border-brand-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-500 to-brand-500/20" />
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-brand-400">â¦</span>
                  <span className="text-sm font-semibold text-white">Má» bÃ i máº«u Band 9</span>
                  <span className="text-[10px] font-mono text-navy-500 bg-navy-700 px-2 py-0.5 rounded-full ml-auto">Viáº¿t riÃªng cho Äá» nÃ y</span>
                </div>
                <p className="text-sm text-navy-100 leading-relaxed italic pl-3">{result.model_introduction}</p>
              </div>
            )}

            </DetailGate>

            {/* ââ Action Buttons ââ */}
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 border border-navy-600 text-navy-300 py-3 rounded-xl font-mono text-sm hover:border-brand-500/50 transition">
                â Cháº¥m bÃ i má»i
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                className="px-6 bg-brand-500/15 border border-brand-500/30 text-brand-400 py-3 rounded-xl font-mono text-sm hover:bg-brand-500/25 transition">
                Chia sáº» â
              </button>
            </div>
          </div>
        )}

        {/* ââââââââââââ FORM ââââââââââââ */}
        {!result && !loading && (
          <div className="animate-fade-up">
            <div className="text-center mb-8">
              <div className="text-xs font-mono tracking-widest uppercase text-brand-400 mb-3">Cháº¥m bÃ i Writing</div>
              <h1 className="text-3xl text-white font-semibold">Ná»p bÃ i luáº­n Äá» cháº¥m Äiá»m</h1>
            </div>

            <div className="mb-5">
              <label className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-2 block">Loáº¡i bÃ i</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ n: 2, label: 'Task 2', desc: 'Opinion, discussion, problem/solution' }, { n: 1, label: 'Task 1', desc: 'Graphs, charts, diagrams, maps' }].map((t) => (
                  <button key={t.n} onClick={() => setTaskType(t.n)} className={`p-4 rounded-xl border-2 text-left transition ${taskType === t.n ? 'border-brand-500 bg-brand-500/10' : 'border-navy-700 bg-navy-800 hover:border-brand-500/30'}`}>
                    <div className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-1">{t.label}</div>
                    <div className="text-xs text-navy-400">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-2 block">Äá» bÃ i</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="DÃ¡n Äá» bÃ i IELTS Writing vÃ o ÄÃ¢y..."
                className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 text-white placeholder-navy-500 focus:border-brand-500 outline-none resize-y min-h-[80px] text-sm leading-relaxed" />
            </div>

            <div className="mb-4">
              <label className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-2 block">BÃ i luáº­n</label>
              <div className="flex border border-navy-700 rounded-xl overflow-hidden mb-3">
                <button onClick={() => setTab('text')} className={`flex-1 py-2.5 text-xs font-mono tracking-wider text-center transition ${tab === 'text' ? 'bg-brand-500/15 text-brand-400' : 'bg-navy-800 text-navy-500 hover:text-navy-300'}`}>â Nháº­p / DÃ¡n</button>
                <button onClick={() => setTab('image')} className={`flex-1 py-2.5 text-xs font-mono tracking-wider text-center border-l border-navy-700 transition ${tab === 'image' ? 'bg-brand-500/15 text-brand-400' : 'bg-navy-800 text-navy-500 hover:text-navy-300'}`}>ð· Táº£i áº£nh</button>
              </div>
              {tab === 'text' && (
                <>
                  <textarea value={essay} onChange={(e) => setEssay(e.target.value)} placeholder="DÃ¡n hoáº·c nháº­p bÃ i luáº­n vÃ o ÄÃ¢y..."
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 text-white placeholder-navy-500 focus:border-brand-500 outline-none resize-y min-h-[200px] leading-relaxed" />
                  <div className={`text-right text-xs font-mono mt-1 ${wordCount < 250 ? 'text-amber-500' : 'text-green-500'}`}>{wordCount} tá»«</div>
                </>
              )}
              {tab === 'image' && (
                <div>
                  {!imageData ? (
                    <label className="block border-2 border-dashed border-navy-600 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500/50 bg-navy-800 transition">
                      <input type="file" accept="image/*" onChange={handleImage} ref={fileRef} className="hidden" />
                      <div className="text-3xl mb-2">ð</div>
                      <p className="text-sm text-navy-400"><strong className="text-brand-400">Nháº¥n Äá» táº£i áº£nh</strong> hoáº·c kÃ©o tháº£</p>
                      <p className="text-xs text-navy-600 mt-1">JPG, PNG â áº£nh bÃ i viáº¿t tay hoáº·c in</p>
                    </label>
                  ) : (
                    <div className="text-center">
                      <img src={`data:${imageType};base64,${imageData}`} alt="Essay" className="max-h-64 rounded-xl border border-navy-700 mx-auto" />
                      <button onClick={() => { setImageData(null); if (fileRef.current) fileRef.current.value = ''; }} className="mt-3 text-xs text-red-400 border border-red-900 px-3 py-1 rounded-full hover:bg-red-900/20 transition">â XÃ³a áº£nh</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <div className="bg-red-900/20 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

            <button onClick={evaluate} className="w-full bg-brand-500 text-navy-900 py-3.5 rounded-xl text-lg font-semibold hover:bg-brand-400 hover:-sight-translate-y-0.5 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 mt-2">
              <span>â¦</span> Cháº¥m bÃ i ngay
            </button>
          </div>
        )}

        {/* ââââââââââââ LOADING ââââââââââââ */}
        {loading && (
          <div className="text-center py-16 animate-fade-up">
            <div className="w-14 h-14 border-[3px] border-navy-600 border-t-brand-500 rounded-full animate-spin-slow mx-auto mb-6" />
            <p className="text-navy-300 italic text-lg">Äang cháº¥m bÃ i cá»§a báº¡n...</p>
            <div className="font-mono text-xs text-navy-600 mt-4 space-y-1.5">
              <p>PhÃ¢n tÃ­ch cáº¥u trÃºc bÃ i luáº­n...</p>
              <p>Cháº¥m Äiá»m 4 tiÃªu chÃ­ IELTS...</p>
              <p>Táº¡o bÃ i máº«u má» bÃ i Band 9...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
