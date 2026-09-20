'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePracticeData } from '@/hooks/usePracticeData';
import { ERROR_LABEL } from '@/lib/practice-insights';
import { buildMistakeQuestions, MistakeQuestion } from '@/lib/mistakes';

const LETTERS = ['A', 'B'];

export default function MistakesClient() {
  const data = usePracticeData();
  const [round, setRound] = useState(0);
  const questions = useMemo<MistakeQuestion[]>(
    () => (data.status === 'ready' ? buildMistakeQuestions(data.recent) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.status, data.recent, round],
  );
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const q = questions[idx];
  const finished = questions.length > 0 && idx >= questions.length;

  const choose = (i: number) => {
    if (chosen !== null || !q) return;
    setChosen(i);
    if (i === q.answer) setCorrectCount(c => c + 1);
  };
  const next = () => { setIdx(i => i + 1); setChosen(null); };
  const again = () => { setRound(r => r + 1); setIdx(0); setChosen(null); setCorrectCount(0); };

  return (
    <div className="min-h-screen">
      <header className="app-header">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="app-logo-wordmark">Write<span className="gold-foil">Right</span></span>
          </Link>
          <span style={{ flex: 1 }} />
          <Link href="/practice" className="app-nav-link">← Practice</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="text-sm font-mono tracking-widest uppercase text-brand-400 mb-3">My mistakes</div>
          <h1 className="text-3xl text-white font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Fix the errors you actually made</h1>
          <p className="text-sm text-navy-400 mt-2">Built from your last graded essays · instant marking · no grading credits used</p>
        </div>

        {data.status === 'loading' && <p className="text-center text-navy-400">Loading…</p>}

        {data.status === 'anon' && (
          <div className="bg-navy-800 border border-brand-500/30 rounded-2xl p-8 text-center">
            <p className="text-navy-200 mb-4">Log in to practise the errors from your own essays.</p>
            <Link href="/login?next=/practice/mistakes" className="btn-foil inline-block px-7 py-2.5 rounded-xl font-semibold">Log in</Link>
          </div>
        )}

        {data.status === 'ready' && questions.length === 0 && (
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 text-center">
            <p className="text-navy-200 mb-4">No usable errors found yet. Get an essay graded and your mistakes will appear here.</p>
            <Link href="/practice" className="btn-foil inline-block px-7 py-2.5 rounded-xl font-semibold">Pick a prompt to write</Link>
          </div>
        )}

        {q && !finished && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={idx}>
                <div className="h-full bg-brand-500 transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
              </div>
              <span className="text-sm font-mono text-navy-400">{idx + 1}/{questions.length}</span>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-brand-400">{ERROR_LABEL[q.category] || 'Grammar'} · from your essay</div>
              <h2 className="text-white text-lg" style={{ fontFamily: 'var(--font-subhead)' }}>Which version is correct?</h2>
              <div className="space-y-2.5" role="radiogroup" aria-label="Answer choices">
                {q.options.map((opt, i) => {
                  let cls = 'border-navy-700 bg-navy-900/40 hover:border-brand-500/50';
                  if (chosen !== null) {
                    if (i === q.answer) cls = 'border-emerald-400 bg-emerald-500/10';
                    else if (i === chosen) cls = 'border-red-400 bg-red-500/10';
                    else cls = 'border-navy-700 bg-navy-900/40 opacity-60';
                  }
                  return (
                    <button key={i} role="radio" aria-checked={chosen === i} disabled={chosen !== null} onClick={() => choose(i)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 flex gap-3 transition ${cls}`}>
                      <span className="font-mono text-brand-400 shrink-0">{LETTERS[i]}</span>
                      <span className="text-white text-base leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {chosen !== null && (
                <div className={`rounded-xl px-4 py-3 border ${chosen === q.answer ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-amber-400/40 bg-amber-500/5'}`}>
                  <div className={`text-sm font-semibold mb-1 ${chosen === q.answer ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {chosen === q.answer ? 'Correct' : `Not quite — the answer is ${LETTERS[q.answer]}`}
                  </div>
                  {q.explanation && <p className="text-navy-200 text-sm leading-relaxed">{q.explanation}</p>}
                </div>
              )}
            </div>
            {chosen !== null && (
              <div className="text-right">
                <button onClick={next} className="btn-foil px-7 py-2.5 rounded-xl font-semibold">{idx + 1 < questions.length ? 'Next question →' : 'See results'}</button>
              </div>
            )}
          </div>
        )}

        {finished && (
          <div className="space-y-5">
            <div className="bg-navy-800 border border-brand-500/30 rounded-2xl p-8 text-center">
              <div className="text-xs font-mono uppercase tracking-widest text-brand-400 mb-3">This round</div>
              <div className="text-5xl text-white font-semibold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                {correctCount}<span className="text-navy-500">/{questions.length}</span>
              </div>
              <p className="text-navy-300 text-sm">
                {correctCount === questions.length ? 'You have fixed every one of these — now write a new essay and avoid them.' : 'The ones you missed are exactly what to watch for in your next essay.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={again} className="btn-foil px-7 py-2.5 rounded-xl font-semibold">New round</button>
              <Link href="/practice" className="px-7 py-2.5 rounded-xl border border-brand-500/50 text-brand-400 hover:bg-brand-500/10 transition">Write an essay</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
