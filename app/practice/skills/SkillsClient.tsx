'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import {
  SkillExercise, ExerciseKind, KIND_META, CRITERION_LABEL, exercisesByKind, SKILL_EXERCISES, withShuffledOptions,
} from '@/lib/skill-exercises';

const SESSION_LEN = 8;
const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Answer = { ex: SkillExercise; chosen: number; correct: boolean };

export default function SkillsClient() {
  const [kind, setKind] = useState<ExerciseKind | 'all' | null>(null);
  const [queue, setQueue] = useState<SkillExercise[]>([]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const shownAt = useRef<number>(0);

  const start = (k: ExerciseKind | 'all') => {
    setKind(k);
    setQueue(shuffle(exercisesByKind(k)).slice(0, SESSION_LEN).map(e => withShuffledOptions(e)));
    setIdx(0); setChosen(null); setAnswers([]);
    shownAt.current = Date.now();
  };

  // /practice/skills?kind=grammar — đến từ thẻ "Bài tập hôm nay": vào làm luôn, khỏi chọn lại.
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('kind');
    if (k && k in KIND_META) start(k as ExerciseKind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = queue[idx];
  const finished = kind !== null && queue.length > 0 && idx >= queue.length;

  // Lưu kết quả để làm lịch sử/gợi ý về sau. Chưa chạy sql/practice.sql thì bảng
  // chưa có: bỏ qua lỗi một cách im lặng, bài tập vẫn làm được bình thường.
  const persist = async (ex: SkillExercise, pick: number, correct: boolean, ms: number) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('exercise_results').insert({
        user_id: user.id, exercise_id: ex.id, kind: ex.kind, criterion: ex.criterion,
        chosen: pick, correct, duration_ms: ms,
      });
    } catch { /* silent */ }
  };

  const choose = (i: number) => {
    if (chosen !== null || !current) return;
    const correct = i === current.answer;
    setChosen(i);
    setAnswers(a => [...a, { ex: current, chosen: i, correct }]);
    void persist(current, i, correct, Date.now() - shownAt.current);
  };

  const next = () => {
    setIdx(i => i + 1);
    setChosen(null);
    shownAt.current = Date.now();
  };

  const score = answers.filter(a => a.correct).length;

  const byCriterion = useMemo(() => {
    const m: Record<string, { ok: number; total: number }> = {};
    answers.forEach(a => {
      const c = a.ex.criterion;
      m[c] = m[c] || { ok: 0, total: 0 };
      m[c].total += 1;
      if (a.correct) m[c].ok += 1;
    });
    return m;
  }, [answers]);

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
        {/* ── Choose a drill ── */}
        {kind === null && (
          <>
            <div className="text-center">
              <div className="text-sm font-mono tracking-widest uppercase text-brand-400 mb-3">Skill drills</div>
              <h1 className="text-3xl text-white font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                Train fast, fix your weak spots
              </h1>
              <p className="text-sm text-navy-400 mt-2">
                {SESSION_LEN} questions per round · instant marking · no AI grading credits used
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {(Object.keys(KIND_META) as ExerciseKind[]).map(k => {
                const m = KIND_META[k];
                const c = CRITERION_LABEL[m.criterion];
                return (
                  <button
                    key={k}
                    onClick={() => start(k)}
                    className="text-left bg-navy-800 border border-navy-700 rounded-2xl p-5 hover:border-brand-500/50 transition"
                  >
                    <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: c.color }}>{c.short}</div>
                    <div className="text-white text-lg font-semibold mb-1">{m.label}</div>
                    <div className="text-sm text-navy-400">{m.hint}</div>
                    <div className="text-xs text-navy-500 mt-3">{exercisesByKind(k).length} questions</div>
                  </button>
                );
              })}
            </div>
            <div className="text-center">
              <button onClick={() => start('all')} className="btn-foil px-8 py-3 rounded-xl font-semibold">
                Mix everything ({SKILL_EXERCISES.length} questions)
              </button>
            </div>
          </>
        )}

        {/* ── In progress ── */}
        {kind !== null && current && !finished && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden" role="progressbar"
                aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={idx}>
                <div className="h-full bg-brand-500 transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
              </div>
              <span className="text-sm font-mono text-navy-400">{idx + 1}/{queue.length}</span>
            </div>

            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider" style={{ color: CRITERION_LABEL[current.criterion].color }}>
                {CRITERION_LABEL[current.criterion].name} · {KIND_META[current.kind].label}
              </div>
              {current.context && (
                <p className="text-navy-300 text-base italic border-l-2 border-brand-500/40 pl-4 leading-relaxed">{current.context}</p>
              )}
              <h2 className="text-white text-lg leading-relaxed" style={{ fontFamily: 'var(--font-subhead)' }}>{current.question}</h2>

              <div className="space-y-2.5" role="radiogroup" aria-label="Answer choices">
                {current.options.map((opt, i) => {
                  const isAnswer = i === current.answer;
                  const isChosen = chosen === i;
                  let cls = 'border-navy-700 bg-navy-900/40 hover:border-brand-500/50';
                  if (chosen !== null) {
                    if (isAnswer) cls = 'border-emerald-400 bg-emerald-500/10';
                    else if (isChosen) cls = 'border-red-400 bg-red-500/10';
                    else cls = 'border-navy-700 bg-navy-900/40 opacity-60';
                  }
                  return (
                    <button
                      key={i}
                      role="radio"
                      aria-checked={isChosen}
                      disabled={chosen !== null}
                      onClick={() => choose(i)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 flex gap-3 transition ${cls}`}
                    >
                      <span className="font-mono text-brand-400 shrink-0">{LETTERS[i]}</span>
                      <span className="text-white text-base leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {chosen !== null && (
                <div className={`rounded-xl px-4 py-3 border ${chosen === current.answer ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-amber-400/40 bg-amber-500/5'}`}>
                  <div className={`text-sm font-semibold mb-1 ${chosen === current.answer ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {chosen === current.answer ? 'Correct' : `Not quite — the answer is ${LETTERS[current.answer]}`}
                  </div>
                  <p className="text-navy-200 text-sm leading-relaxed">{current.explanation}</p>
                </div>
              )}
            </div>

            {chosen !== null && (
              <div className="text-right">
                <button onClick={next} className="btn-foil px-7 py-2.5 rounded-xl font-semibold">
                  {idx + 1 < queue.length ? 'Next question →' : 'See results'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {finished && (
          <div className="space-y-5">
            <div className="bg-navy-800 border border-brand-500/30 rounded-2xl p-8 text-center">
              <div className="text-xs font-mono uppercase tracking-widest text-brand-400 mb-3">This round</div>
              <div className="text-5xl text-white font-semibold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                {score}<span className="text-navy-500">/{answers.length}</span>
              </div>
              <p className="text-navy-300 text-sm">
                {score === answers.length ? 'Perfect score — now try writing an essay to apply it.'
                  : score >= answers.length * 0.6 ? 'Good work. Review the mistakes below, then do another round.'
                  : 'This is where more practice will pay off. Read the explanations carefully, then try again.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(byCriterion).map(([c, v]) => (
                <div key={c} className="bg-navy-800 border border-navy-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: CRITERION_LABEL[c as keyof typeof CRITERION_LABEL].color }}>{v.ok}/{v.total}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mt-1">{CRITERION_LABEL[c as keyof typeof CRITERION_LABEL].short}</div>
                </div>
              ))}
            </div>

            {answers.some(a => !a.correct) && (
              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5 space-y-4">
                <div className="text-sm font-mono uppercase tracking-wider text-brand-400">Questions to review</div>
                {answers.filter(a => !a.correct).map(a => (
                  <div key={a.ex.id} className="text-sm leading-relaxed">
                    <p className="text-white mb-1">{a.ex.question}</p>
                    <p className="text-emerald-300">Answer: {a.ex.options[a.ex.answer]}</p>
                    <p className="text-navy-300 mt-1">{a.ex.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={() => start(kind!)} className="btn-foil px-7 py-2.5 rounded-xl font-semibold">New round</button>
              <button onClick={() => setKind(null)} className="px-7 py-2.5 rounded-xl border border-navy-600 text-navy-200 hover:border-brand-500/50 transition">Choose another type</button>
              <Link href="/practice" className="px-7 py-2.5 rounded-xl border border-brand-500/50 text-brand-400 hover:bg-brand-500/10 transition">Write an essay</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
