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
  const desc = `Band tổng ${points.length} bài gần nhất, từ ${first.band.toFixed(1)} đến ${last.band.toFixed(1)}.`;

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
          <Link href="/practice" className="app-nav-link">← Luyện tập</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="text-sm font-mono tracking-widest uppercase text-brand-400 mb-3">Tiến bộ</div>
          <h1 className="text-3xl text-white font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Bạn đang đi đến đâu</h1>
        </div>

        {data.status === 'loading' && <p className="text-center text-navy-400">Đang tải…</p>}

        {data.status === 'anon' && (
          <div className="bg-navy-800 border border-brand-500/30 rounded-2xl p-8 text-center">
            <p className="text-navy-200 mb-4">Đăng nhập để xem chuỗi ngày, xu hướng band và hồ sơ lỗi của bạn.</p>
            <Link href="/login?next=/practice/progress" className="btn-foil inline-block px-7 py-2.5 rounded-xl font-semibold">Đăng nhập</Link>
          </div>
        )}

        {data.status === 'ready' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat value={streak.current} label="Chuỗi ngày hiện tại" />
              <Stat value={streak.longest} label="Chuỗi dài nhất" />
              <Stat value={data.evals.length} label="Bài đã chấm" />
            </div>
            {streak.current > 0 && !streak.activeToday && (
              <p className="text-center text-sm text-amber-300">Hôm nay bạn chưa luyện — làm một bài để giữ chuỗi {streak.current} ngày.</p>
            )}

            {/* Bài tập hôm nay */}
            <Card title="Bài tập hôm nay">
              <p className="text-white text-lg mb-1" style={{ fontFamily: 'var(--font-subhead)' }}>{KIND_META[plan.kind].label}</p>
              <p className="text-navy-300 text-sm leading-relaxed mb-4">{plan.reason}</p>
              <Link href={`/practice/skills?kind=${plan.kind}`} className="btn-foil inline-block px-6 py-2 rounded-lg text-sm font-semibold">Làm ngay</Link>
            </Card>

            {!hasEvals ? (
              <Card title="Chưa có dữ liệu">
                <p className="text-navy-300 text-sm mb-4">Xu hướng band và hồ sơ lỗi sẽ xuất hiện sau bài chấm đầu tiên của bạn.</p>
                <Link href="/practice" className="btn-foil inline-block px-6 py-2 rounded-lg text-sm font-semibold">Chọn một đề để viết</Link>
              </Card>
            ) : (
              <>
                {/* Xu hướng band — theo quy tắc sẵn có, chỉ người dùng trả phí hoặc đang được mở khoá mới xem */}
                <Card title="Xu hướng band tổng">
                  {entLoading ? (
                    <div style={{ minHeight: 120 }} />
                  ) : canSeeProgress && trend.length > 0 ? (
                    <TrendChart points={trend} />
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-4xl text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                        {trend.length ? trend[trend.length - 1].band.toFixed(1) : '—'}
                      </div>
                      <p className="text-navy-400 text-sm mb-4">Band bài gần nhất. Nâng cấp để xem đường tiến bộ qua từng bài.</p>
                      <Link href="/pricing" className="btn-foil inline-block px-6 py-2 rounded-lg text-sm font-semibold">Xem gói nâng cấp</Link>
                    </div>
                  )}
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card title="Band từng tiêu chí · 5 bài gần nhất">
                    {hasAvgs ? (
                      <div className="space-y-4">
                        {CRITERIA.map(c => avgs[c] !== null && (
                          <Bar key={c} label={CRITERION_LABEL[c].name} value={avgs[c]!} max={9} color={CRITERION_LABEL[c].color} right={avgs[c]!.toFixed(1)} />
                        ))}
                      </div>
                    ) : <p className="text-navy-400 text-sm">Chưa có điểm từng tiêu chí.</p>}
                  </Card>

                  <Card title="Hồ sơ lỗi · 10 bài gần nhất">
                    {errs.evalsCounted === 0 ? (
                      <p className="text-navy-400 text-sm">Chưa đọc được danh sách lỗi từ các bài đã chấm.</p>
                    ) : errTop.length === 0 ? (
                      <p className="text-emerald-300 text-sm">Không có lỗi nào được đánh dấu trong các bài gần đây.</p>
                    ) : (
                      <div className="space-y-4">
                        {errTop.map(e => (
                          <Bar key={e.category} label={ERROR_LABEL[e.category]} value={e.count} max={errTop[0].count}
                            color="#E06C75" right={`${e.count} lỗi`} />
                        ))}
                        <p className="text-xs text-navy-500">{errs.total} lỗi trong {errs.evalsCounted} bài.</p>
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )}

            <Card title="Độ chính xác bài tập kỹ năng">
              {totalEx === 0 ? (
                <p className="text-navy-400 text-sm">
                  Chưa có kết quả bài tập nào được lưu. <Link href="/practice/skills" className="text-brand-400 underline">Làm một lượt</Link> để bắt đầu theo dõi.
                </p>
              ) : (
                <div className="space-y-4">
                  {CRITERIA.map(c => acc[c].total > 0 && (
                    <Bar key={c} label={CRITERION_LABEL[c].name} value={acc[c].ok} max={acc[c].total}
                      color={CRITERION_LABEL[c].color} right={`${Math.round((acc[c].ok / acc[c].total) * 100)}% · ${acc[c].total} câu`} />
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
