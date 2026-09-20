'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { QuotaBanner } from '@/components/DetailGate';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePracticeData } from '@/hooks/usePracticeData';
import { activityDays, computeStreak, ictDay, recommendToday } from '@/lib/practice-insights';
import { KIND_META } from '@/lib/skill-exercises';
import {
  PRACTICE_ITEMS, DEFAULT_FILTER, PracticeFilter, PracticeItem, AttemptSummary,
  applyFilter, summariseAttempts, distinct, suggestNext, kindLabel, categoryLabel,
} from '@/lib/practice';

const PAGE_SIZE = 12;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full border text-sm transition ${
        active
          ? 'border-brand-500 bg-brand-500/15 text-brand-400'
          : 'border-navy-700 bg-navy-800 text-navy-300 hover:border-brand-500/40'
      }`}
    >
      {children}
    </button>
  );
}

function PromptCard({ item, summary }: { item: PracticeItem; summary?: AttemptSummary }) {
  const done = !!summary;
  return (
    <article className="bg-navy-800 border border-navy-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-brand-500/40 transition">
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider">
        <span className="px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-400">Task {item.task}</span>
        <span className="text-navy-400">{kindLabel(item.kind)}</span>
        <span className="text-navy-600">·</span>
        <span className="text-navy-400">{categoryLabel(item.category)}</span>
        {done && (
          <span className="ml-auto px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 normal-case tracking-normal">
            Done {summary!.count}×{summary!.best != null ? ` · best ${summary!.best.toFixed(1)}` : ''}
          </span>
        )}
      </div>
      <p className="text-white text-base leading-relaxed" style={{ fontFamily: 'var(--font-subhead)' }}>
        {item.title}
      </p>
      <div className="mt-auto pt-1">
        <Link
          href={`/evaluate?practice=${encodeURIComponent(item.id)}`}
          className="btn-foil inline-block px-5 py-2 rounded-lg text-sm font-semibold"
        >
          {done ? 'Rewrite this prompt' : 'Start writing'}
        </Link>
      </div>
    </article>
  );
}

export default function PracticeClient() {
  const { isPaid, loading: entLoading, freeLeft } = useEntitlement();
  const data = usePracticeData();
  const signedIn = data.status === 'loading' ? null : data.status === 'ready';
  const attempts = useMemo(() => summariseAttempts(data.evals), [data.evals]);
  const [filter, setFilter] = useState<PracticeFilter>(DEFAULT_FILTER);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const today = ictDay(Date.now());
  const plan = useMemo(() => recommendToday(data.recent, today), [data.recent, today]);
  const streak = useMemo(
    () => computeStreak(activityDays(data.evals, data.exercises), today),
    [data.evals, data.exercises, today],
  );

  const set = (patch: Partial<PracticeFilter>) => {
    setFilter(f => ({ ...f, ...patch }));
    setVisible(PAGE_SIZE);
  };

  const scoped = useMemo(
    () => PRACTICE_ITEMS.filter(p => filter.task === 'all' || p.task === filter.task),
    [filter.task],
  );
  const kinds = useMemo(() => distinct(scoped, p => p.kind), [scoped]);
  const categories = useMemo(() => distinct(scoped, p => p.category), [scoped]);
  const list = useMemo(() => applyFilter(PRACTICE_ITEMS, filter, attempts), [filter, attempts]);
  const next = useMemo(() => suggestNext(attempts), [attempts]);

  const doneCount = Object.keys(attempts).length;

  return (
    <div className="min-h-screen">
      <header className="app-header">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="app-logo-wordmark">Write<span className="gold-foil">Right</span></span>
          </Link>
          <span style={{ flex: 1 }} />
          <Link href="/dashboard" className="app-nav-link mr-4">Dashboard</Link>
          <Link href="/pricing" className="app-nav-link">Pricing</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <QuotaBanner onUpgrade={() => { window.location.href = '/pricing'; }} />

        <div className="text-center">
          <div className="text-sm font-mono tracking-widest uppercase text-brand-400 mb-3">Practice</div>
          <h1 className="text-3xl text-white font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            One essay a day, one step higher
          </h1>
          <p className="text-sm text-navy-400 mt-2 max-w-xl mx-auto">
            Pick a prompt, write your essay and get a four-criteria band score, or do a quick skill drill below — instant marking, no grading credits used.
          </p>
        </div>

        {/* Quick entry points */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-navy-800 border border-brand-500/30 rounded-2xl p-5">
            <div className="text-xs font-mono uppercase tracking-wider text-brand-400 mb-2">Suggested prompt</div>
            {next ? (
              <>
                <p className="text-white text-base leading-relaxed mb-3 line-clamp-3" style={{ fontFamily: 'var(--font-subhead)' }}>
                  {next.title}
                </p>
                <Link href={`/evaluate?practice=${encodeURIComponent(next.id)}`} className="btn-foil inline-block px-5 py-2 rounded-lg text-sm font-semibold">
                  Write this prompt
                </Link>
              </>
            ) : (
              <p className="text-navy-300 text-sm">You have completed the whole prompt bank — rewrite an earlier prompt to beat your own best band.</p>
            )}
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5">
            <div className="text-xs font-mono uppercase tracking-wider text-brand-400 mb-2">Today's drill · 3–5 min</div>
            <p className="text-white text-base mb-1" style={{ fontFamily: 'var(--font-subhead)' }}>{KIND_META[plan.kind].label}</p>
            <p className="text-navy-300 text-sm leading-relaxed mb-3">{plan.reason}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href={`/practice/skills?kind=${plan.kind}`} className="inline-block px-5 py-2 rounded-lg text-sm font-semibold border border-brand-500/50 text-brand-400 hover:bg-brand-500/10 transition">
                Start now
              </Link>
              <Link href="/practice/skills" className="text-sm text-navy-300 hover:text-brand-400 transition">All skill drills →</Link>
              {signedIn && <Link href="/practice/mistakes" className="text-sm text-navy-300 hover:text-brand-400 transition">Drill my own mistakes →</Link>}
            </div>
          </div>
        </div>

        {/* Grading status */}
        {signedIn !== null && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-navy-300 px-1">
            {signedIn ? (
              <>
                <span>
                  Streak: <strong className="text-white">{streak.current}</strong>
                  {streak.current > 0 && !streak.activeToday ? ' (practise today to keep it going)' : ''}
                </span>
                <span>Completed <strong className="text-white">{doneCount}</strong>/{PRACTICE_ITEMS.length} prompts</span>
                {!entLoading && (isPaid
                  ? <span>Gradings: <strong className="text-white">unlimited</strong></span>
                  : <span>Gradings left this week: <strong className="text-white">{freeLeft}</strong></span>)}
                <Link href="/practice/progress" className="text-brand-400 underline">View progress</Link>
              </>
            ) : (
              <span>
                <Link href="/login?next=/practice" className="text-brand-400 underline">Log in</Link> to save your practice history and get scored.
              </span>
            )}
          </div>
        )}

        {/* Filters */}
        <section aria-label="Prompt filters" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 2, 1] as const).map(t => (
              <Chip key={String(t)} active={filter.task === t} onClick={() => set({ task: t, kind: 'all', category: 'all' })}>
                {t === 'all' ? 'All' : `Task ${t}`}
              </Chip>
            ))}
            <span className="mx-1 w-px bg-navy-700" aria-hidden />
            {([['all', 'Any status'], ['todo', 'Not done'], ['done', 'Done']] as const).map(([v, label]) => (
              <Chip key={v} active={filter.status === v} onClick={() => set({ status: v })}>{label}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active={filter.kind === 'all'} onClick={() => set({ kind: 'all' })}>All types</Chip>
            {kinds.map(k => (
              <Chip key={k} active={filter.kind === k} onClick={() => set({ kind: k })}>{kindLabel(k)}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active={filter.category === 'all'} onClick={() => set({ category: 'all' })}>All topics</Chip>
            {categories.map(c => (
              <Chip key={c} active={filter.category === c} onClick={() => set({ category: c })}>{categoryLabel(c)}</Chip>
            ))}
          </div>
          <input
            value={filter.query}
            onChange={e => set({ query: e.target.value })}
            placeholder="Search prompts…"
            aria-label="Search prompts"
            className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-white placeholder-navy-500 focus:border-brand-500 outline-none text-base"
          />
        </section>

        {/* Prompt list */}
        <section aria-label="Prompt list" className="space-y-4">
          <div className="text-sm text-navy-400">{list.length} matching prompts</div>
          {list.length === 0 ? (
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 text-center text-navy-300">
              No prompts match your filters.{' '}
              <button className="text-brand-400 underline" onClick={() => { setFilter(DEFAULT_FILTER); setVisible(PAGE_SIZE); }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {list.slice(0, visible).map(p => (
                <PromptCard key={p.id} item={p} summary={attempts[p.id]} />
              ))}
            </div>
          )}
          {visible < list.length && (
            <div className="text-center">
              <button
                onClick={() => setVisible(v => v + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl border border-navy-600 text-navy-200 hover:border-brand-500/50 transition"
              >
                Show more ({list.length - visible} prompts)
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
