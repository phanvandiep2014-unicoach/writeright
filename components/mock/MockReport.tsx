'use client';
/**
 * Màn kết quả của một lượt Thi thử Writing — cả hai phần trên MỘT trang.
 *
 * Thứ tự các khối là có chủ ý và không nên đảo:
 *   1. Điểm tổng có trọng số — thứ học viên mở trang để tìm.
 *   2. Hai phần cạnh nhau    — trả lời ngay "phần nào kéo điểm xuống".
 *   3. Đồng hồ               — sự thật đo được, miễn phí, luôn hiện.
 *   4. Tổng hợp hai bài      — phần chỉ có khi đặt hai bài cạnh nhau.
 *
 * Khối 2 và 4 bị khoá với tài khoản miễn phí; khối 1 và 3 luôn mở. Lý do:
 * band tổng và nhận xét thời gian đủ để học viên tin kết quả là thật, nhưng
 * không cho biết SỬA THẾ NÀO — đó mới là phần trả tiền.
 */
import { ReactNode } from 'react';
import Link from 'next/link';
import { useEntitlement } from '@/hooks/useEntitlement';
import type { TimingAnalysis, TaskPace, TimingFinding } from '@/lib/mock-timing';

export interface TaskScore {
  band: number | null;
  ta: number | null; cc: number | null; lr: number | null; gra: number | null;
  wordCount: number;
  evalId: string | null;
  title: string;
}

export interface MockResult {
  id: string | null;
  mode: 'full' | 'task1' | 'task2';
  paperLabel: string | null;
  overallBand: number | null;
  task1: TaskScore | null;
  task2: TaskScore | null;
  timing: TimingAnalysis;
  report: any | null;
  reportError: string | null;
  /** Có giá trị khi đây là chặng Writing của bài thi thử 4 kỹ năng (LMS mở
   *  qua /sso kèm mock_session) — null cho luyện tập tự do trên WriteRight. */
  examSync?: { ok: boolean; error?: string } | null;
}

const CRIT = [
  { key: 'ta', code: 'TA', label: 'Task Achievement', color: '#7B9FE0' },
  { key: 'cc', code: 'CC', label: 'Coherence & Cohesion', color: '#56B6A2' },
  { key: 'lr', code: 'LR', label: 'Lexical Resource', color: '#E06C75' },
  { key: 'gra', code: 'GRA', label: 'Grammatical Range', color: '#E5C07B' },
] as const;

const SEV_COLOR: Record<string, string> = {
  good: '#56B6A2', watch: '#E5C07B', critical: '#E06C75',
};
const SEV_LABEL: Record<string, string> = {
  good: 'Tốt', watch: 'Cần chú ý', critical: 'Phải sửa',
};

function fmtMin(sec: number) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}′${String(s).padStart(2, '0')}″`;
}

/** Khoá phần chi tiết với tài khoản miễn phí — làm mờ nội dung thật phía sau
 *  để thấy rõ có gì đang bị che, hợp tông tối của phòng thi. */
function Locked({ children, onUpgrade }: { children: ReactNode; onUpgrade: () => void }) {
  const { canSeeDetail, loading } = useEntitlement();
  if (loading) return <div style={{ minHeight: 140 }} />;
  if (canSeeDetail) return <>{children}</>;
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div aria-hidden className="pointer-events-none select-none" style={{ filter: 'blur(8px)', opacity: 0.55 }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3 p-6"
        style={{ background: 'linear-gradient(180deg, rgba(11,18,32,0) 0%, rgba(11,18,32,.75) 40%, rgba(11,18,32,.96) 85%)' }}>
        <span className="text-xs font-mono uppercase tracking-widest text-brand-400">Phân tích chi tiết</span>
        <p className="text-white text-lg font-semibold max-w-sm leading-snug">
          Bạn đã có band tổng và bản đọc đồng hồ. Phần còn lại cho biết <em>vì sao</em> và <em>sửa thế nào</em>.
        </p>
        <Link href="/pricing" onClick={onUpgrade}
          className="btn-foil px-7 py-2.5 rounded-lg text-sm font-semibold">
          Mở khoá điểm từng tiêu chí & lộ trình
        </Link>
        <small className="text-navy-400">Học viên UNICOACH dùng mã lớp được ưu đãi riêng.</small>
      </div>
    </div>
  );
}

/** Thanh thời gian một phần thi: lập dàn ý · viết · rà bài, vẽ theo tỷ lệ thật. */
function PaceBar({ p }: { p: TaskPace }) {
  const total = Math.max(1, p.planningSec + p.writingSec + p.reviewSec);
  const seg = [
    { sec: p.planningSec, color: '#7B9FE0', label: 'Lập dàn ý' },
    { sec: p.writingSec, color: '#56B6A2', label: 'Viết' },
    { sec: p.reviewSec, color: '#E5C07B', label: 'Rà lại' },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <span className="text-sm font-semibold text-white">Task {p.task}</span>
        <span className="text-xs font-mono text-navy-400">
          {p.wordCount}/{p.minWords}+ từ · {p.wordsPerMin} từ/phút
          {p.autoSubmitted && <span className="text-red-400"> · hết giờ</span>}
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-navy-900 border border-navy-700">
        {seg.map(s => s.sec > 0 && (
          <div key={s.label} title={`${s.label}: ${fmtMin(s.sec)}`}
            style={{ width: `${(s.sec / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex gap-4 mt-2 flex-wrap">
        {seg.map(s => (
          <span key={s.label} className="text-[11px] font-mono text-navy-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: s.color }} />
            {s.label} {fmtMin(s.sec)}
          </span>
        ))}
      </div>
    </div>
  );
}

function FindingRow({ f }: { f: TimingFinding }) {
  return (
    <li className="flex gap-3 py-3 border-t border-navy-700/70 first:border-t-0">
      <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEV_COLOR[f.severity] }} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{f.title}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: SEV_COLOR[f.severity], border: `1px solid ${SEV_COLOR[f.severity]}55` }}>
            {SEV_LABEL[f.severity]}
          </span>
          {f.criterion && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              ảnh hưởng {f.criterion}
            </span>
          )}
        </div>
        <p className="text-sm text-navy-300 leading-relaxed mt-1">{f.detail}</p>
      </div>
    </li>
  );
}

function TaskScoreCard({ s, weight }: { s: TaskScore; weight: string }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5 flex-1 min-w-[260px]">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-mono uppercase tracking-widest text-brand-400">{s.title}</span>
        <span className="text-[10px] font-mono text-navy-500 px-1.5 py-0.5 rounded border border-navy-600">{weight}</span>
      </div>
      <div className="flex items-end gap-3 mb-4">
        <span className="text-4xl font-bold text-brand-400 leading-none">{s.band ?? '—'}</span>
        <span className="text-xs text-navy-500 pb-1">{s.wordCount} từ</span>
      </div>
      <div className="space-y-2">
        {CRIT.map(c => {
          const v = (s as any)[c.key] as number | null;
          return (
            <div key={c.key} className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono w-8 text-navy-500">{c.code}</span>
              <div className="flex-1 h-1.5 rounded-full bg-navy-900 overflow-hidden">
                <div style={{ width: `${((v ?? 0) / 9) * 100}%`, background: c.color }} className="h-full rounded-full" />
              </div>
              <span className="text-xs font-mono w-7 text-right" style={{ color: c.color }}>{v ?? '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Một mục song ngữ: tiếng Việt là chính, tiếng Anh nhỏ bên dưới. */
function Bi({ v, className = '' }: { v: any; className?: string }) {
  if (!v) return null;
  const vi = typeof v === 'string' ? v : v.vi;
  const en = typeof v === 'string' ? null : v.en;
  return (
    <div className={className}>
      <p className="text-sm text-navy-100 leading-relaxed">{vi}</p>
      {en && <p className="text-xs text-navy-500 italic leading-relaxed mt-1">{en}</p>}
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="bg-navy-800 border border-navy-700 rounded-2xl p-6">
      <div className="text-xs font-mono uppercase tracking-widest text-brand-400 mb-1">{eyebrow}</div>
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function MockReport({ r, onRetake, locked = false }: { r: MockResult; onRetake: () => void; locked?: boolean }) {
  const full = r.mode === 'full';
  const rep = r.report;
  const isExam = r.examSync !== undefined;

  return (
    <div className="space-y-5 animate-fade-up">
      {locked && (
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl px-5 py-3 text-sm text-brand-300 text-center">
          Chặng Writing của bài thi thử 4 kỹ năng — UNICOACH LMS
        </div>
      )}

      {isExam && r.examSync && !r.examSync.ok && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-5 py-4 text-sm text-red-300">
          <strong className="block mb-1">Chưa gửi được điểm về LMS.</strong>
          Band của bạn là <strong>{r.overallBand ?? '—'}</strong> — đã lưu ở WriteRight, nhưng chặng Speaking tiếp theo trên
          LMS có thể chưa mở khoá. Hãy báo giáo viên band này để được nhập tay ({r.examSync.error || 'lỗi không rõ'}).
        </div>
      )}
      {isExam && r.examSync?.ok && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-2.5 text-xs text-emerald-300 text-center font-mono">
          ✓ Đã gửi band về LMS — có thể quay lại tab thi để tiếp tục Speaking
        </div>
      )}

      {/* ── 1. Điểm tổng ──────────────────────────────────────────────── */}
      <div className="bg-navy-800 border border-brand-500/30 rounded-2xl p-7 text-center">
        <div className="text-xs font-mono uppercase tracking-widest text-brand-400 mb-2">
          {r.paperLabel ? `Kết quả ${r.paperLabel}` : 'Kết quả thi thử'}
        </div>
        <div className="text-6xl font-bold text-brand-400 leading-none mb-2">{r.overallBand ?? '—'}</div>
        <p className="text-sm text-navy-300">
          {full
            ? <>Band Writing tổng — tính bằng <strong className="text-navy-100">(Task 1 + 2 × Task 2) ÷ 3</strong>, đúng cách IELTS cộng điểm.</>
            : <>Band của phần bạn vừa làm. Thi đủ hai phần để có band Writing tổng.</>}
        </p>
        {full && r.task1?.band != null && r.task2?.band != null && (
          <p className="text-xs font-mono text-navy-500 mt-3">
            ({r.task1.band} + 2 × {r.task2.band}) ÷ 3 = {r.overallBand}
          </p>
        )}
      </div>

      {/* ── 2. Hai phần cạnh nhau ─────────────────────────────────────── */}
      <Locked onUpgrade={() => {}}>
        <div className="flex gap-4 flex-wrap">
          {r.task1 && <TaskScoreCard s={r.task1} weight="hệ số 1" />}
          {r.task2 && <TaskScoreCard s={r.task2} weight="hệ số 2" />}
        </div>
      </Locked>

      {/* ── 3. Đồng hồ — luôn mở ──────────────────────────────────────── */}
      <Section eyebrow="Quản lý thời gian" title={r.timing.headline}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-2 rounded-full bg-navy-900 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${r.timing.score}%`,
                background: r.timing.score >= 75 ? '#56B6A2' : r.timing.score >= 45 ? '#E5C07B' : '#E06C75',
              }} />
          </div>
          <span className="text-sm font-mono text-navy-300 tabular-nums">{r.timing.score}/100</span>
        </div>

        <div className="space-y-5 mb-5">
          {r.timing.paces.map(p => (
            <PaceBar key={p.task} p={p} />
          ))}
        </div>

        {r.timing.findings.length > 0 ? (
          <ul>{r.timing.findings.map((f, i) => <FindingRow key={f.code + i} f={f} />)}</ul>
        ) : (
          <p className="text-sm text-navy-400">Không có ghi chú nào về thời gian.</p>
        )}
      </Section>

      {/* ── 4. Tổng hợp hai bài ───────────────────────────────────────── */}
      {r.reportError && (
        <div className="bg-navy-800 border border-amber-500/30 rounded-2xl p-4 text-sm text-amber-300">
          {r.reportError}
        </div>
      )}

      {rep && (
        <Locked onUpgrade={() => {}}>
          <div className="space-y-5">
            {rep.weakest_link && (
              <Section eyebrow="Mắt xích yếu nhất" title={
                CRIT.find(c => c.code === rep.weakest_link.criterion)?.label ?? String(rep.weakest_link.criterion)
              }>
                <Bi v={rep.weakest_link.why} />
                <p className="text-xs text-navy-500 mt-3">
                  Nâng đúng một tiêu chí này ở cả hai bài là cách rẻ nhất để band tổng nhích lên.
                </p>
              </Section>
            )}

            {Array.isArray(rep.cross_task_patterns) && rep.cross_task_patterns.length > 0 && (
              <Section eyebrow="Lặp ở cả hai bài" title="Thói quen theo bạn sang cả Task 1 lẫn Task 2">
                <p className="text-xs text-navy-500 mb-4">
                  Lỗi chỉ xuất hiện một lần có thể là do hôm nay. Lỗi xuất hiện ở cả hai bài là thói quen — và thói quen thì sửa được.
                </p>
                <div className="space-y-4">
                  {rep.cross_task_patterns.map((p: any, i: number) => (
                    <div key={i} className="border-l-2 pl-4"
                      style={{ borderColor: CRIT.find(c => c.code === p.criterion)?.color ?? '#4B5563' }}>
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{p.criterion}</span>
                      </div>
                      <Bi v={p.pattern} />
                      {Array.isArray(p.evidence) && p.evidence.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {p.evidence.map((e: string, j: number) => (
                            <li key={j} className="text-xs font-mono text-navy-400 bg-navy-900/60 rounded px-2.5 py-1.5">{e}</li>
                          ))}
                        </ul>
                      )}
                      {p.fix && (
                        <div className="mt-2.5 flex gap-2">
                          <span className="text-brand-400 text-sm flex-shrink-0">→</span>
                          <Bi v={p.fix} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {Array.isArray(rep.exam_strategy) && rep.exam_strategy.length > 0 && (
              <Section eyebrow="Chiến thuật phòng thi" title="Làm khác đi ở lượt thi sau">
                <ul className="space-y-3">
                  {rep.exam_strategy.map((s: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-brand-400 font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}</span>
                      <Bi v={s} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {Array.isArray(rep.study_plan) && rep.study_plan.length > 0 && (
              <Section eyebrow="Lộ trình ba tuần" title="Luyện gì trước khi thi thử lần sau">
                <div className="grid gap-3 md:grid-cols-3">
                  {rep.study_plan.map((w: any, i: number) => (
                    <div key={i} className="bg-navy-900/60 border border-navy-700 rounded-xl p-4">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-brand-400 mb-2">
                        Ngày {w.days}
                      </div>
                      <Bi v={w.focus} className="mb-3" />
                      <div className="border-t border-navy-700 pt-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Bài tập</div>
                        <Bi v={w.drill} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {rep.next_paper_focus && (
              <div className="bg-brand-500/10 border border-brand-500/25 rounded-2xl p-5">
                <div className="text-xs font-mono uppercase tracking-widest text-brand-400 mb-2">Đề kế tiếp</div>
                <Bi v={rep.next_paper_focus} />
              </div>
            )}
          </div>
        </Locked>
      )}

      {/* ── Điều hướng ────────────────────────────────────────────────── */}
      {locked ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 text-center">
          <p className="text-sm text-navy-200">
            Đây là bài thi thử chính thức nên không thể làm lại. Hãy quay lại tab UNICOACH LMS để tiếp tục các kỹ năng còn lại.
          </p>
          <p className="text-xs text-navy-500 mt-2">Bạn có thể đóng tab WriteRight này.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 flex-wrap">
            <button onClick={onRetake}
              className="flex-1 min-w-[180px] border border-navy-600 text-navy-300 py-3.5 rounded-xl font-mono text-base hover:border-brand-500/50 transition">
              ← Làm đề khác
            </button>
            <Link href="/dashboard"
              className="px-6 bg-brand-500/15 border border-brand-500/30 text-brand-400 py-3.5 rounded-xl font-mono text-base hover:bg-brand-500/25 transition flex items-center justify-center">
              Xem bài chấm đầy đủ →
            </Link>
          </div>
          <p className="text-xs text-navy-500 text-center">
            Hai bài viết đã được lưu vào Dashboard như bài chấm bình thường — mở ở đó để xem lỗi sai inline và bản viết lại band 9.
          </p>
        </>
      )}
    </div>
  );
}
