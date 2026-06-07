'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

type EvalResult = {
  overall_band: number;
  band_descriptor: string;
  headline: string;
  summary: string;
  task_achievement: { band: number; feedback: string; improvements: string[] };
  lexical_resource: { band: number; feedback: string; improvements: string[] };
  grammatical_range: { band: number; feedback: string; improvements: string[] };
  coherence_cohesion: { band: number; feedback: string; improvements: string[] };
  key_strengths: string[];
  priority_fixes: string[];
  error_corrections: { original: string; corrected: string; explanation: string }[];
  model_introduction: string;
};

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
    if (!prompt) { setError('Vui lòng nhập đề bài'); return; }
    if (tab === 'text' && !essay) { setError('Vui lòng nhập bài luận'); return; }
    if (tab === 'image' && !imageData) { setError('Vui lòng tải ảnh bài viết'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          taskPrompt: prompt,
          essayText: tab === 'text' ? essay : null,
          imageBase64: tab === 'image' ? imageData : null,
          imageType: tab === 'image' ? imageType : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setEssay('');
    setPrompt('');
    setImageData(null);
  };

  const criteria = [
    { key: 'task_achievement' as const, label: 'Task Achievement' },
    { key: 'lexical_resource' as const, label: 'Lexical Resource' },
    { key: 'grammatical_range' as const, label: 'Grammar & Accuracy' },
    { key: 'coherence_cohesion' as const, label: 'Coherence & Cohesion' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-sm">W</div>
            <span className="font-['DM_Serif_Display'] text-lg text-white">Luyen<span className="text-brand-400">Viet</span></span>
          </Link>
          <Link href="/dashboard" className="text-sm text-navy-400 hover:text-white transition font-mono">Dashboard →</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* ── RESULTS ── */}
        {result && (
          <div className="animate-fade-up">
            <div className="text-xs font-mono tracking-widest uppercase text-brand-400 mb-4 flex items-center gap-2">
              Kết quả chấm điểm <span className="flex-1 h-px bg-navy-700" />
            </div>

            {/* Overall band */}
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex items-center gap-6 mb-6 flex-wrap">
              <div className="text-center flex-shrink-0">
                <div className="w-20 h-20 rounded-full border-4 border-brand-500 flex items-center justify-center mx-auto mb-1">
                  <span className="font-['DM_Serif_Display'] text-3xl text-brand-400">{result.overall_band}</span>
                </div>
                <div className="text-xs font-mono text-navy-400 tracking-wider uppercase">Overall</div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="font-['DM_Serif_Display'] text-brand-300 italic mb-1">{result.band_descriptor}</div>
                <h2 className="font-['DM_Serif_Display'] text-xl text-white mb-1">{result.headline}</h2>
                <p className="text-sm text-navy-300">{result.summary}</p>
              </div>
            </div>

            {/* Criteria grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {criteria.map((c) => {
                const d = result[c.key];
                if (!d) return null;
                return (
                  <div key={c.key} className="bg-navy-800 border border-navy-700 rounded-xl p-4 hover:border-brand-500/30 transition">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono tracking-wider uppercase text-navy-400">{c.label}</span>
                      <span className="font-['DM_Serif_Display'] text-2xl text-brand-400">{d.band}</span>
                    </div>
                    <div className="h-1 bg-navy-700 rounded mb-3"><div className="h-1 rounded bg-gradient-to-r from-brand-500 to-brand-300" style={{ width: `${(d.band / 9) * 100}%` }} /></div>
                    <p className="text-xs text-navy-300 leading-relaxed mb-2">{d.feedback}</p>
                    {d.improvements.map((tip: string, i: number) => (
                      <p key={i} className="text-xs text-navy-500 pl-3 relative before:content-['→'] before:absolute before:left-0 before:text-brand-500">{tip}</p>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Error corrections */}
            {result.error_corrections?.length > 0 && (
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 mb-6">
                <h3 className="font-['DM_Serif_Display'] text-lg text-white mb-4">✏ Sửa lỗi chi tiết</h3>
                {result.error_corrections.map((c, i) => (
                  <div key={i} className="py-3 border-b border-navy-700 last:border-0">
                    <div className="font-mono text-xs text-red-400 line-through mb-1">✗ {c.original}</div>
                    <div className="font-mono text-xs text-green-400 mb-1">✓ {c.corrected}</div>
                    <div className="text-xs text-navy-500 italic">{c.explanation}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths + Fixes */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-navy-800 border border-green-900/50 rounded-xl p-4">
                <div className="text-xs font-mono tracking-wider uppercase text-green-500 mb-3">✓ Điểm mạnh</div>
                {result.key_strengths?.map((s, i) => (
                  <p key={i} className="text-sm text-navy-200 py-1.5 border-b border-navy-700 last:border-0">✓ {s}</p>
                ))}
              </div>
              <div className="bg-navy-800 border border-red-900/50 rounded-xl p-4">
                <div className="text-xs font-mono tracking-wider uppercase text-red-400 mb-3">! Cần cải thiện</div>
                {result.priority_fixes?.map((f, i) => (
                  <p key={i} className="text-sm text-navy-200 py-1.5 border-b border-navy-700 last:border-0">! {f}</p>
                ))}
              </div>
            </div>

            {/* Model intro */}
            {result.model_introduction && (
              <div className="bg-navy-800 border-l-4 border-brand-500 rounded-xl p-5 mb-6">
                <h3 className="font-['DM_Serif_Display'] text-lg text-white mb-1">✦ Mở bài mẫu Band 9</h3>
                <div className="text-xs font-mono text-navy-500 mb-3">Viết riêng cho đề bài này</div>
                <p className="text-sm text-navy-100 leading-relaxed italic">{result.model_introduction}</p>
              </div>
            )}

            <button onClick={reset} className="w-full border border-navy-600 text-navy-300 py-3 rounded-xl font-mono text-sm hover:border-brand-500/50 transition">
              ← Chấm bài mới
            </button>
          </div>
        )}

        {/* ── FORM ── */}
        {!result && !loading && (
          <div className="animate-fade-up">
            <div className="text-center mb-8">
              <div className="text-xs font-mono tracking-widest uppercase text-brand-400 mb-3">Chấm bài Writing</div>
              <h1 className="font-['DM_Serif_Display'] text-3xl text-white">Nộp bài luận để chấm điểm</h1>
            </div>

            {/* Task type */}
            <div className="mb-5">
              <label className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-2 block">Loại bài</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ n: 2, label: 'Task 2', desc: 'Opinion, discussion, problem/solution' }, { n: 1, label: 'Task 1', desc: 'Graphs, charts, diagrams, maps' }].map((t) => (
                  <button key={t.n} onClick={() => setTaskType(t.n)} className={`p-4 rounded-xl border-2 text-left transition ${taskType === t.n ? 'border-brand-500 bg-brand-500/10' : 'border-navy-700 bg-navy-800 hover:border-brand-500/30'}`}>
                    <div className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-1">{t.label}</div>
                    <div className="text-xs text-navy-400">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className="mb-5">
              <label className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-2 block">Đề bài</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Dán đề bài IELTS Writing vào đây..." className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 text-white placeholder-navy-500 focus:border-brand-500 outline-none resize-y min-h-[80px] text-sm leading-relaxed" />
            </div>

            {/* Tabs */}
            <div className="mb-4">
              <label className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-2 block">Bài luận</label>
              <div className="flex border border-navy-700 rounded-xl overflow-hidden mb-3">
                <button onClick={() => setTab('text')} className={`flex-1 py-2.5 text-xs font-mono tracking-wider text-center transition ${tab === 'text' ? 'bg-brand-500/15 text-brand-400' : 'bg-navy-800 text-navy-500 hover:text-navy-300'}`}>✏ Nhập / Dán</button>
                <button onClick={() => setTab('image')} className={`flex-1 py-2.5 text-xs font-mono tracking-wider text-center border-l border-navy-700 transition ${tab === 'image' ? 'bg-brand-500/15 text-brand-400' : 'bg-navy-800 text-navy-500 hover:text-navy-300'}`}>📷 Tải ảnh</button>
              </div>

              {tab === 'text' && (
                <>
                  <textarea value={essay} onChange={(e) => setEssay(e.target.value)} placeholder="Dán hoặc nhập bài luận vào đây..." className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 text-white placeholder-navy-500 focus:border-brand-500 outline-none resize-y min-h-[200px] leading-relaxed" />
                  <div className={`text-right text-xs font-mono mt-1 ${wordCount < 250 ? 'text-amber-500' : 'text-green-500'}`}>{wordCount} từ</div>
                </>
              )}

              {tab === 'image' && (
                <div>
                  {!imageData ? (
                    <label className="block border-2 border-dashed border-navy-600 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500/50 bg-navy-800 transition">
                      <input type="file" accept="image/*" onChange={handleImage} ref={fileRef} className="hidden" />
                      <div className="text-3xl mb-2">📄</div>
                      <p className="text-sm text-navy-400"><strong className="text-brand-400">Nhấn để tải ảnh</strong> hoặc kéo thả</p>
                      <p className="text-xs text-navy-600 mt-1">JPG, PNG — ảnh bài viết tay hoặc in</p>
                    </label>
                  ) : (
                    <div className="text-center">
                      <img src={`data:${imageType};base64,${imageData}`} alt="Essay" className="max-h-64 rounded-xl border border-navy-700 mx-auto" />
                      <button onClick={() => { setImageData(null); if (fileRef.current) fileRef.current.value = ''; }} className="mt-3 text-xs text-red-400 border border-red-900 px-3 py-1 rounded-full hover:bg-red-900/20 transition">✕ Xóa ảnh</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
            )}

            <button onClick={evaluate} className="w-full bg-brand-500 text-navy-900 py-3.5 rounded-xl font-['DM_Serif_Display'] text-lg hover:bg-brand-400 hover:-translate-y-0.5 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 mt-2">
              <span>✦</span> Chấm bài ngay
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="text-center py-16 animate-fade-up">
            <div className="w-12 h-12 border-3 border-navy-600 border-t-brand-500 rounded-full animate-spin-slow mx-auto mb-6" style={{ borderWidth: '3px' }} />
            <p className="text-navy-300 italic font-['DM_Serif_Display'] text-lg">Đang chấm bài của bạn...</p>
            <div className="font-mono text-xs text-navy-600 mt-4 space-y-1">
              <p>Đọc và phân tích bài luận...</p>
              <p>Chấm điểm 4 tiêu chí IELTS...</p>
              <p>Viết bài mẫu mở bài Band 9...</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
