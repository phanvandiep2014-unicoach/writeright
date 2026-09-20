'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePracticeData } from '@/hooks/usePracticeData';
import {
  CRITERIA, ERROR_LABEL, activityDays, bandTrend, computeStreak, criterionAverages,
  errorProfile, exerciseAccuracy, ictDay, recommendToday, topErrors,
} from '@/lib/practice-insights';
import { CRITERION_LABEL, KIND_META } from '@/lib/skill-exercises';
import { currentBand, planFor, type Pace } from '@/lib/goal';

const PACE_TEXT: Record<Pace, { text: string; cls: string }> = {
  reached: { text: 'You are at your target band — keep it steady with regular practice.', cls: 'text-emerald-300' },
  'on-track': { text: 'Realistic: a small, steady gain each week gets you there.', cls: 'text-emerald-300' },
  stretch: { text: 'Achievable, but you will need to practise consistently every week.', cls: 'text-amber-300' },
  ambitious: { text: 'Very ambitious for the time left. Consider moving your exam date or lowering the target.', cls: 'text-rose-300' },
  'no-date': { text: 'Add an exam date on your dashboard to get a pace check.', cls: 'text-navy-400' },
  'exam-passed': { text: 'Your exam date has passed. Update it on your dashboard.', cls: 'text-navy-400' },
};

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-navy-800 border border-navy-700 rounded-2xl p-5 ${className}`}>
      <h2 className="text-xs font-mono uppercase tracking-wider text-brand-400 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 text-center">
      <div className="text-3xl text-white font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{value}</div>
      <div className="text-[11px] font-mono uppercase tracking-wider text-navy-500 mt-1">{label}</div>
    </div>
  );
}

function Bar({ label, value, max, color, right }: { label: string; value: number; max: number; color: string; right: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-navy-200">{label}</span>
        <span className="font-mono text-navy-300">{right}</span>
      </div>
      <div className="h-2 rounded-full bg-navy-700 overflow-hidden" role="img" aria-label={`${label}: ${right}`}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
      </div>
    </div>
  );
}

function TrendChart({ points }: { points: { t: string; band: number }[] }) {
  const W = 640, H = 220, padL = 34, padR = 16, padT = 16, padB = 28;
  const lo = Math.max(0, Math.floor(Math.min(...points.map(p => p.band))) - 1);
  const hi = Math.min(9, Math.ceil(Math.max(...points.map(p => p.band))) + 1);
  const x = (i: number) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (points.length - 1));
  const y = (b: number) => padT + (1 - (b - lo) / (hi - lo)) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.band).toFixed(1)}`).join(' ');
  const ticks: number[] = [];
  for (let b = lo; b <= hi; b++) ticks.push(b);
  const first = points[0], last = points[points.length - 1];
  const desc = `Overall band over the last ${points.length} essays, from ${first.band.toFixed(1)} to ${last.band.toFixed(1)}.`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={desc}>
      <title>{desc}</title>
      {ticks.map(b => (
        <g key={b}>
          <line x1={padL} x2={W - padR} y1={y(b)} y2={y(b)} stroke="#2A3566" strokeWidth={1} />
          <text x={padL - 8} y={y(b) + 4} textAnchor="end" fontSize={11} fill="#8B93B8">{b}</text>
        </g>
      ))}
      {points.length > 1 && <path d={path} fill="none" stroke="#E7CE8E" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.band)} r={4} fill="#C8A14B" stroke="#11183A" strokeWidth={1.5}>
          <title>{`${new Date(p.t).toLocaleDateString('vi-VN')}: ${p.band.toFixed(1)}`}</title>
        </circle>
      ))}
      <text x={x(0)} y={H - 8} textAnchor={points.length === 1 ? 'middle' : 'start'} fontSize={11} fill="#8B93B8">
        {new Date(first.t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
      </text>
      {points.length > 1 && (
        <text x={x(points.length - 1)} y={H - 8} textAnchor="end" fontSize={11} fill="#8B93B8">
          {new Date(last.t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
        </text>
      )}
    </svg>
  );
}

export default function ProgressClient() {
  const data = usePracticeData();
  const { canSeeProgress, loading: entLoading } = useEntitlement();
  const today = ictDay(Date.now());

  const streak = useMemo(() => computeStreak(activityDays(data.evals, data.exercises), today), [data.evals, data.exercises, today]);
  const trend = useMemo(() => bandTrend(data.evals), [data.evals]);
  const avgs = useMemo(() => criterionAverages(data.recent), [data.recent]);
  const errs = useMemo(() => errorProfile(data.recent), [data.recent]);
  const errTop = useMemo(() => topErrors(errs, 7), [errs]);
  const acc = useMemo(() => exerciseAccuracy(data.exercises), [data.exercises]);
  const plan = useMemo(() => recommendToday(data.recent, today), [data.recent, today]);
  const cur = useMemo(() => currentBand(data.evals), [data.evals]);
  const gp = useMemo(() => (data.goal ? planFor(data.goal, cur, today, avgs) : null), [data.goal, cur, today, avgs]);

  const hasEvals = data.evals.length > 0;
  const hasAvgs = CRITERIA.some(c => avgs[c] !== null);
  const totalEx = data.exercises.length;

  return (
    <div className="min-h-screen">
      <header className="app-header">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="app-logo-wordmark">Write<span className="gold-foil">Right</span></span>
          </Link>
          <span style={{ flex: 1 }} />
          <Link href="/practice" className="app-nav-link">← Practice</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="text-sm font-mono tracking-widest uppercase text-brand-400 mb-3">Progress</div>
          <h1 className="text-3xl text-white font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Where you stand</h1>
        </div>

        {data.status === 'loading' && <p className="text-center text-navy-400">Loading…</p>}

        {data.status === 'anon' && (
          <div className="bg-navy-800 border border-brand-500/30 rounded-2xl p-8 text-center">
            <p className="text-navy-200 mb-4">Log in to see your streak, band trend and error profile.</p>
            <Link href="/login?next=/practice/progress" className="btn-foil inline-block px-7 py-2.5 rounded-xl font-semibold">Log in</Link>
          </div>
        )}

        {data.status === 'ready' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat value={streak.current} label="Current streak" />
              <Stat value={streak.longest} label="Longest streak" />
              <Stat value={data.evals.length} label="Essays graded" />
            </div>
            {streak.current > 0 && !streak.activeToday && (
              <p className="text-center text-sm text-amber-300">You haven't practised today — do one exercise to keep your {streak.current}-day streak.</p>
            )}

            {/* Today's drill */}
            <Card title="Today's drill">
              <p className="text-white text-lg mb-1" style={{ fontFamily: 'var(--font-subhead)' }}>{KIND_META[plan.kind].label}</p>
              <p className="text-navy-300 text-sm leading-relaxed mb-4">{plan.reason}</p>
              <Link href={`/practice/skills?kind=${plan.kind}`} className="btn-foil inline-block px-6 py-2 rounded-lg text-sm font-semibold">Start now</Link>
            </Card>

            {/* Goal & weekly plan */}
            <Card title="Your goal">
              {!data.goal || !gp ? (
                <p className="text-navy-300 text-sm">
                  Set a target band and exam date to get a weekly plan.{' '}
                  <Link href="/dashboard" className="text-brand-400 underline">Set my goal</Link>
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><div className="text-2xl text-white font-semibold">{cur !== null ? cur.toFixed(1) : '—'}</div><div className="text-[11px] font-mono uppercase text-navy-500">Now</div></div>
                    <div><div className="text-2xl text-brand-400 font-semibold">{data.goal.target_band.toFixed(1)}</div><div className="text-[11px] font-mono uppercase text-navy-500">Target</div></div>
                    <div><div className="text-2xl text-white font-semibold">{gp.daysLeft !== null && gp.daysLeft >= 0 ? gp.daysLeft : '—'}</div><div className="text-[11px] font-mono uppercase text-navy-500">Days to exam</div></div>
                  </div>
                  <p className={`text-sm ${PACE_TEXT[gp.pace].cls}`}>
                    {cur === null ? 'Get your first essay graded to see how far you are from your target.' : PACE_TEXT[gp.pace].text}
                    {gp.perWeek !== null && gp.pace !== 'reached' && cur !== null && ` You need about +${gp.perWeek.toFixed(2)} band per week.`}
                  </p>
                  {gp.pace !== 'reached' && cur !== null && (
                    <div className="bg-navy-900/60 border border-navy-700 rounded-xl p-4">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-brand-400 mb-2">Suggested week</div>
                      <ul className="text-sm text-navy-200 space-y-1 list-disc pl-5">
                        <li>{gp.essaysPerWeek} graded {gp.essaysPerWeek === 1 ? 'essay' : 'essays'}, then rewrite each one with the guided panel.</li>
                        <li>{gp.drillDaysPerWeek} days with a skill drill{gp.focus ? `, focusing on ${CRITERION_LABEL[gp.focus].short}` : ''}.</li>
                        <li>One round of <Link href="/practice/mistakes" className="text-brand-400 underline">My Mistakes</Link> to lock in your own errors.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {!hasEvals ? (
              <Card title="No data yet">
                <p className="text-navy-300 text-sm mb-4">Your band trend and error profile will appear after your first graded essay.</p>
                <Link href="/practice" className="btn-foil inline-block px-6 py-2 rounded-lg text-sm font-semibold">Pick a prompt to write</Link>
              </Card>
            ) : (
              <>
                {/* Band trend — existing rule: paid or unlocked users only */}
                <Card title="Overall band trend">
                  {entLoading ? (
                    <div style={{ minHeight: 120 }} />
                  ) : canSeeProgress && trend.length > 0 ? (
                    <TrendChart points={trend} />
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-4xl text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                        {trend.length ? trend[trend.length - 1].band.toFixed(1) : '—'}
                      </div>
                      <p className="text-navy-400 text-sm mb-4">Your latest band. Upgrade to see your progress line across every essay.</p>
                      <Link href="/pricing" className="btn-foil inline-block px-6 py-2 rounded-lg text-sm font-semibold">See upgrade plans</Link>
                    </div>
                  )}
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card title="Band by criterion · last 5 essays">
                    {hasAvgs ? (
                      <div className="space-y-4">
                        {CRITERIA.map(c => avgs[c] !== null && (
                          <Bar key={c} label={CRITERION_LABEL[c].name} value={avgs[c]!} max={9} color={CRITERION_LABEL[c].color} right={avgs[c]!.toFixed(1)} />
                        ))}
                      </div>
                    ) : <p className="text-navy-400 text-sm">No criterion scores yet.</p>}
                  </Card>

                  <Card title="Error profile · last 10 essays">
                    {errs.evalsCounted === 0 ? (
                      <p className="text-navy-400 text-sm">Couldn't read the error list from your graded essays.</p>
                    ) : errTop.length === 0 ? (
                      <p className="text-emerald-300 text-sm">No errors were flagged in your recent essays.</p>
                    ) : (
                      <div className="space-y-4">
                        {errTop.map(e => (
                          <Bar key={e.category} label={ERROR_LABEL[e.category]} value={e.count} max={errTop[0].count}
                            color="#E06C75" right={`${e.count} errors`} />
                        ))}
                        <p className="text-xs text-navy-500">{errs.total} errors across {errs.evalsCounted} essays.</p>
                        <Link href="/practice/mistakes" className="inline-block text-sm text-brand-400 underline">Drill these mistakes →</Link>
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )}

            <Card title="Skill drill accuracy">
              {totalEx === 0 ? (
                <p className="text-navy-400 text-sm">
                  No drill results saved yet. <Link href="/practice/skills" className="text-brand-400 underline">Do a round</Link> to start tracking.
                </p>
              ) : (
                <div className="space-y-4">
                  {CRITERIA.map(c => acc[c].total > 0 && (
                    <Bar key={c} label={CRITERION_LABEL[c].name} value={acc[c].ok} max={acc[c].total}
                      color={CRITERION_LABEL[c].color} right={`${Math.round((acc[c].ok / acc[c].total) * 100)}% · ${acc[c].total} questions`} />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
