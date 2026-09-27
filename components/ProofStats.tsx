'use client';
import { useEffect, useRef, useState } from 'react';

/* ══════════════════════════════════════════════════════════════
   ProofStats — khối "số liệu thật" trên trang chủ WriteRight.

   Mọi con số lấy từ /api/stats, tính thẳng trên bảng `evaluations`.
   Chỉ số nào chưa đủ mẫu thì API không trả ra và khối đó tự ẩn —
   không có số giả, không có dữ liệu minh hoạ.
   ══════════════════════════════════════════════════════════════ */

type Metrics = {
  essaysTotal?: number;
  essays30d?: number;
  learnersTotal?: number;
  learners30d?: number;
  correctionsTotal?: number;
  wordsTotal?: number;
  weekly?: { week_start: string; essays: number; learners: number }[];
  topErrors?: { category: string; n: number; pct: number }[];
  criteria?: {
    taskAchievement?: number; coherenceCohesion?: number;
    lexicalResource?: number; grammaticalRange?: number; n?: number;
  };
  progressCurve?: { nth: number; avg_band: number; n: number }[];
  improvement?: { users?: number; avgDelta?: number; medianDelta?: number; pctImproved?: number };
  bandDistribution?: { bucket: string; n: number }[];
  stageProgress?: { fromStage: number; avgDays: number; medianDays: number; n: number }[];
};

// Nhãn giai đoạn — cùng ranh giới 0.5 band với bucket phân bố band bên trên.
// fromStage là mốc XUẤT PHÁT (0 = dưới 5.0 … 5 = 7.0–7.4); stage 6 (7.5+) không
// có "giai đoạn kế tiếp" nên không xuất hiện trong stage_progress.
const STAGE_LABEL: Record<number, string> = {
  0: '< 5.0 →', 1: '5.0 →', 2: '5.5 →', 3: '6.0 →', 4: '6.5 →', 5: '7.0 →',
};

const ERROR_LABEL: Record<string, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng · collocation',
  register: 'Văn phong thiếu trang trọng',
  tone: 'Sắc thái · khẳng định quá mạnh',
  reference: 'Đại từ · liên kết mơ hồ',
  dialect: 'Lẫn lộn Anh – Mỹ',
  spelling: 'Chính tả',
  khác: 'Khác',
};

const nf = new Intl.NumberFormat('vi-VN');

/* ── Số đếm tăng dần khi cuộn tới ────────────────────────────── */
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setN(value); return; }

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return <span ref={ref}>{nf.format(n)}{suffix}</span>;
}

/* ── Ô số lớn ────────────────────────────────────────────────── */
function Stat({ value, label, note, suffix }: { value: number; label: string; note?: string; suffix?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px 8px' }}>
      {/* .foil-ink chứ KHÔNG phải .gold-foil: nền ở đây là giấy sáng, dải vàng
          nhạt chỉ đạt tương phản 1.05:1 — chữ biến mất. .foil-ink giữ nguyên
          vẻ kim loại nhưng đánh bằng sapphire, và tự đổi về vàng ở chế độ tối. */}
      <div className="foil-ink" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px,4.4vw,40px)', lineHeight: 1.1 }}>
        <CountUp value={value} suffix={suffix} />
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--wr-ink-soft)', marginTop: 9 }}>
        {label}
      </div>
      {note && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--wr-ink-faint)', marginTop: 4 }}>{note}</div>
      )}
    </div>
  );
}

/* ── Khung thẻ đồ thị ────────────────────────────────────────── */
function Card({ title, hint, children, footer }: { title: string; hint?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--wr-surface)', border: '1px solid var(--wr-border)',
      borderRadius: 'var(--radius)', padding: '22px 20px 18px', boxShadow: 'var(--shadow-card)',
    }}>
      <h3 className="heading-vi" style={{ fontSize: 17, marginBottom: hint ? 4 : 14 }}>{title}</h3>
      {hint && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--wr-ink-faint)', margin: '0 0 14px', lineHeight: 1.5 }}>{hint}</p>
      )}
      {children}
      {footer && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--wr-ink-soft)', margin: '14px 0 0', lineHeight: 1.55 }}>{footer}</p>
      )}
    </div>
  );
}

/* ── Đồ thị cột: lượt chấm theo tuần ─────────────────────────── */
function WeeklyBars({ data }: { data: NonNullable<Metrics['weekly']> }) {
  const W = 340, H = 132, padB = 22, padT = 8;
  const max = Math.max(1, ...data.map((d) => d.essays));
  const step = W / data.length;
  const bw = Math.min(24, step * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img"
         aria-label="Số bài được chấm theo từng tuần trong 12 tuần gần nhất">
      <line x1="0" y1={H - padB} x2={W} y2={H - padB} stroke="var(--wr-border)" strokeWidth="1" />
      {data.map((d, i) => {
        const h = ((H - padB - padT) * d.essays) / max;
        const x = i * step + (step - bw) / 2;
        const last = i === data.length - 1;
        return (
          <g key={d.week_start}>
            <title>{`Tuần ${new Date(d.week_start).toLocaleDateString('vi-VN')}: ${d.essays} bài · ${d.learners} người`}</title>
            <rect x={x} y={H - padB - h} width={bw} height={Math.max(h, 1.5)} rx="2"
                  fill={last ? 'var(--wr-chart-accent)' : 'var(--wr-chart-1)'} />
            {(i % 3 === 0 || last) && (
              <text x={x + bw / 2} y={H - 7} textAnchor="middle"
                    fontSize="9" fill="var(--wr-ink-faint)" fontFamily="var(--font-body)">
                {new Date(d.week_start).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Đồ thị đường: điểm TB theo lần chấm thứ n ───────────────── */
function ProgressLine({ data }: { data: NonNullable<Metrics['progressCurve']> }) {
  const W = 340, H = 150, padL = 26, padR = 10, padB = 24, padT = 12;
  const bands = data.map((d) => Number(d.avg_band));
  const lo = Math.floor((Math.min(...bands) - 0.3) * 2) / 2;
  const hi = Math.ceil((Math.max(...bands) + 0.3) * 2) / 2;
  const span = Math.max(0.5, hi - lo);

  const x = (i: number) => padL + ((W - padL - padR) * i) / Math.max(1, data.length - 1);
  const y = (b: number) => padT + (H - padT - padB) * (1 - (b - lo) / span);
  const pts = data.map((d, i) => `${x(i)},${y(Number(d.avg_band))}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img"
         aria-label="Điểm band trung bình theo thứ tự bài chấm">
      {[lo, (lo + hi) / 2, hi].map((b) => (
        <g key={b}>
          <line x1={padL} y1={y(b)} x2={W - padR} y2={y(b)} stroke="var(--wr-border)" strokeWidth="1" strokeDasharray="2 3" />
          <text x={padL - 5} y={y(b) + 3} textAnchor="end" fontSize="9" fill="var(--wr-ink-faint)" fontFamily="var(--font-body)">
            {b.toFixed(1)}
          </text>
        </g>
      ))}
      <polyline points={pts} fill="none" stroke="var(--wr-chart-accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.nth}>
          <title>{`Bài thứ ${d.nth}: trung bình ${Number(d.avg_band).toFixed(2)} (${d.n} bài)`}</title>
          <circle cx={x(i)} cy={y(Number(d.avg_band))} r="3.4" fill="var(--wr-surface)" stroke="var(--wr-chart-accent)" strokeWidth="2" />
          <text x={x(i)} y={H - 7} textAnchor="middle" fontSize="9" fill="var(--wr-ink-faint)" fontFamily="var(--font-body)">
            {d.nth}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Thanh ngang (dùng cho lỗi thường gặp & 4 tiêu chí) ──────── */
function BarRow({ label, value, pct, highlight }: { label: string; value: string; pct: number; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--wr-ink)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600, color: highlight ? 'var(--wr-chart-accent)' : 'var(--wr-ink-soft)', whiteSpace: 'nowrap' }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'var(--wr-track)', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(1.5, Math.min(100, pct))}%`, height: '100%', borderRadius: 4,
          background: highlight ? 'var(--wr-chart-accent)' : 'var(--wr-chart-1)',
        }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */

export default function ProofStats() {
  const [m, setM] = useState<Metrics | null>(null);
  const [meta, setMeta] = useState<{ generatedAt?: string; lastEvalAt?: string | null }>({});

  useEffect(() => {
    let alive = true;
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.ok) return;
        setM(d.metrics ?? {});
        setMeta({ generatedAt: d.generatedAt, lastEvalAt: d.lastEvalAt });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Chưa có số nào đủ mẫu → không dựng khối. Thà trống còn hơn số yếu.
  if (!m || Object.keys(m).length === 0) return null;

  const crit = m.criteria;
  const critRows = crit
    ? ([
        ['Task Achievement', crit.taskAchievement],
        ['Coherence & Cohesion', crit.coherenceCohesion],
        ['Lexical Resource', crit.lexicalResource],
        ['Grammatical Range', crit.grammaticalRange],
      ].filter((r) => typeof r[1] === 'number') as [string, number][])
    : [];
  const weakest = critRows.length ? critRows.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;

  const topErr = m.topErrors?.[0];
  const stageRows = m.stageProgress ?? [];
  const maxStageDays = Math.max(1, ...stageRows.map((s) => s.avgDays));
  const hasCharts = !!(m.weekly || m.progressCurve || m.topErrors || critRows.length || stageRows.length);

  const updated = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <section id="so-lieu" style={{ background: 'var(--wr-bg)', padding: '72px 20px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* Tiêu đề */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Số liệu thật · đọc thẳng từ hệ thống</div>
          <h2 className="heading-vi" style={{ fontSize: 'clamp(24px,3.6vw,34px)', marginBottom: 14 }}>
            Chúng tôi không kể, chúng tôi mở sổ
          </h2>
          <p style={{ fontFamily: 'var(--font-subhead)', fontSize: 18, color: 'var(--wr-ink-soft)', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
            Mỗi con số dưới đây được tính lại tự động từ các bài đã chấm trên WriteRight.
            Không có số quảng cáo, không có dữ liệu minh hoạ.
          </p>
        </div>

        {/* Dãy số lớn */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 24,
          padding: '30px 12px', marginBottom: 34,
          borderTop: '1px solid var(--wr-border)', borderBottom: '1px solid var(--wr-border)',
        }}>
          {typeof m.essaysTotal === 'number' && (
            <Stat value={m.essaysTotal} label="Bài đã chấm"
                  note={m.essays30d ? `${nf.format(m.essays30d)} bài trong 30 ngày qua` : undefined} />
          )}
          {typeof m.learnersTotal === 'number' && (
            <Stat value={m.learnersTotal} label="Người học"
                  note={m.learners30d ? `${nf.format(m.learners30d)} người hoạt động 30 ngày qua` : undefined} />
          )}
          {typeof m.correctionsTotal === 'number' && (
            <Stat value={m.correctionsTotal} label="Chỗ sửa lỗi cụ thể" note="trích nguyên văn từ bài của người học" />
          )}
          {typeof m.wordsTotal === 'number' && (
            <Stat value={m.wordsTotal} label="Chữ đã được đọc và chấm" />
          )}
          {typeof m.improvement?.avgDelta === 'number' && (
            <Stat value={Math.round((m.improvement.avgDelta ?? 0) * 100) / 100} label="Band tăng trung bình"
                  note={`trên ${nf.format(m.improvement.users ?? 0)} người viết từ 3 bài trở lên`} />
          )}
        </div>

        {/* Đồ thị */}
        {hasCharts && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

            {m.weekly && (
              <Card title="Tần suất chấm bài theo tuần"
                    hint="12 tuần gần nhất. Cột vàng là tuần đang chạy.">
                <WeeklyBars data={m.weekly} />
              </Card>
            )}

            {m.progressCurve && m.progressCurve.length >= 3 && (
              <Card title="Điểm trung bình theo thứ tự bài viết"
                    hint="Trục ngang là bài thứ mấy của một người. Đây là tiến bộ thật của cả cộng đồng, không phải của một cá nhân được chọn."
                    footer={typeof m.improvement?.pctImproved === 'number'
                      ? `${m.improvement.pctImproved}% người viết từ 3 bài trở lên có band cao hơn lúc bắt đầu.`
                      : undefined}>
                <ProgressLine data={m.progressCurve} />
              </Card>
            )}

            {m.topErrors && (
              <Card title="Lỗi thường gặp nhất"
                    hint="Tổng hợp từ toàn bộ chỗ sửa mà AI đã trích ra."
                    footer={topErr
                      ? `Cứ 10 lỗi thì khoảng ${Math.round(topErr.pct / 10)} nằm ở nhóm "${ERROR_LABEL[topErr.category] ?? topErr.category}". Bài của bạn thì sao?`
                      : undefined}>
                {m.topErrors.map((e, i) => (
                  <BarRow key={e.category}
                          label={ERROR_LABEL[e.category] ?? e.category}
                          value={`${e.pct}%`}
                          pct={(e.n / m.topErrors![0].n) * 100}
                          highlight={i === 0} />
                ))}
              </Card>
            )}

            {critRows.length > 0 && (
              <Card title="Điểm trung bình từng tiêu chí"
                    hint={`Trung bình cộng trên ${nf.format(crit?.n ?? 0)} bài đã chấm, thang 9.0.`}
                    footer={weakest ? `Tiêu chí kéo điểm xuống nhiều nhất là ${weakest[0]}. Đây cũng là chỗ dễ lấy lại điểm nhanh nhất.` : undefined}>
                {critRows.map(([label, v]) => (
                  <BarRow key={label} label={label} value={v.toFixed(2)} pct={(v / 9) * 100}
                          highlight={weakest ? label === weakest[0] : false} />
                ))}
              </Card>
            )}

            {stageRows.length > 0 && (
              <Card title="Thời gian nâng band trung bình, theo từng giai đoạn"
                    hint="Mỗi dòng: người học mất trung bình bao lâu, tính từ lần đầu chạm mốc band này tới lần đầu chạm mốc cao hơn. Chỉ tính mốc có ít nhất 3 người đã vượt qua."
                    footer="Đây là thời gian thật giữa hai lần chấm của cùng một người, không phải mục tiêu hay cam kết.">
                {stageRows.map((s) => (
                  <BarRow key={s.fromStage}
                          label={`${STAGE_LABEL[s.fromStage] ?? s.fromStage} band kế tiếp`}
                          value={`~${s.avgDays} ngày`}
                          pct={(s.avgDays / maxStageDays) * 100} />
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Ghi chú trung thực */}
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--wr-ink-faint)',
          textAlign: 'center', marginTop: 26, lineHeight: 1.6,
        }}>
          Chỉ số nào chưa đủ số mẫu để nói lên điều gì, chúng tôi để trống thay vì làm tròn cho đẹp.
          {updated ? ` Cập nhật lúc ${updated}.` : ''}
        </p>
      </div>
    </section>
  );
}
