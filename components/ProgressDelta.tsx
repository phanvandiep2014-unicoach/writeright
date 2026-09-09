'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * <ProgressDelta> — so sánh bài vừa chấm với bài GẦN NHẤT CÙNG DẠNG của chính
 * học viên đó.
 *
 * Vì sao đáng làm: dữ liệu này đã nằm sẵn trong bảng `evaluations` từ lâu,
 * nhưng chưa bao giờ được đem ra đối chiếu — mỗi lần chấm là một ốc đảo. Cảm
 * giác "mình đang tiến bộ" mới là thứ kéo học viên viết bài tiếp theo, và nó
 * chỉ xuất hiện khi được đặt hai con số cạnh nhau.
 *
 * KHÔNG gọi thêm AI. Một truy vấn Supabase, tính toán ở client.
 * Chưa có bài nào trước đó thì render null — không bịa ra "lần đầu tiên".
 */

const CRITERIA = [
  { key: 'ta_band' as const, label: 'TR', color: '#7B9FE0' },
  { key: 'cc_band' as const, label: 'CC', color: '#56B6A2' },
  { key: 'lr_band' as const, label: 'LR', color: '#E06C75' },
  { key: 'gra_band' as const, label: 'GRA', color: '#E5C07B' },
];

type Row = {
  overall_band: number | null;
  ta_band: number | null;
  cc_band: number | null;
  lr_band: number | null;
  gra_band: number | null;
  created_at: string;
  feedback: any;
};

export type CurrentBands = {
  overall_band: number;
  /** Có bài AI trả thiếu một tiêu chí — để undefined lọt qua thay vì ép kiểu ở nơi gọi. */
  ta_band?: number;
  cc_band?: number;
  lr_band?: number;
  gra_band?: number;
  error_count: number;
};

/** "3 ngày trước", "2 tuần trước" — đủ dùng, không kéo thêm thư viện ngày tháng. */
function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

function fmtDelta(d: number): string {
  if (Math.abs(d) < 0.001) return '—';
  return (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1);
}

function deltaColor(d: number): string {
  if (Math.abs(d) < 0.001) return '#8B93B0';
  return d > 0 ? '#56B6A2' : '#E06C75';
}

export function ProgressDelta({
  taskType,
  current,
}: {
  taskType: number;
  current: CurrentBands;
}) {
  const [prev, setPrev] = useState<Row | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setReady(true); return; }

        const { data } = await supabase
          .from('evaluations')
          .select('overall_band, ta_band, cc_band, lr_band, gra_band, created_at, feedback')
          .eq('user_id', user.id)
          .eq('task_type', taskType)
          .order('created_at', { ascending: false })
          .limit(3);

        const rows = (data || []) as Row[];

        // Bài vừa chấm đã được ghi vào bảng trước khi trang này hiện, nên dòng
        // mới nhất thường CHÍNH LÀ nó. Bỏ qua dòng nào vừa được tạo (dưới 5
        // phút) và trùng khít cả 5 điểm với kết quả đang xem.
        const isCurrent = (r: Row) =>
          Date.now() - new Date(r.created_at).getTime() < 5 * 60 * 1000 &&
          r.overall_band === current.overall_band &&
          r.ta_band === current.ta_band &&
          r.cc_band === current.cc_band &&
          r.lr_band === current.lr_band &&
          r.gra_band === current.gra_band;

        const found = rows.find(r => !isCurrent(r) && r.overall_band != null) || null;
        if (!cancelled) { setPrev(found); setReady(true); }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [taskType, current.overall_band, current.ta_band, current.cc_band, current.lr_band, current.gra_band]);

  if (!ready || !prev || prev.overall_band == null) return null;

  const dOverall = current.overall_band - prev.overall_band;
  const prevErrors: number = Array.isArray(prev.feedback?.error_corrections)
    ? prev.feedback.error_corrections.length
    : -1;
  const dErrors = prevErrors >= 0 ? current.error_count - prevErrors : null;

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-2xl px-6 py-5">
      <div className="flex items-baseline gap-2 flex-wrap mb-4">
        <span className="text-sm font-mono text-brand-500/70 tracking-wider uppercase">
          So với lần trước
        </span>
        <span className="text-sm text-navy-500 italic">
          Task {taskType} · {timeAgo(prev.created_at)}
        </span>
      </div>

      {/* Band tổng */}
      <div className="flex items-center gap-4 flex-wrap mb-5">
        <div className="flex items-baseline gap-2 font-mono tabular-nums">
          <span className="text-2xl text-navy-400">{prev.overall_band}</span>
          <span className="text-navy-600">→</span>
          <span className="text-3xl font-bold text-brand-400">{current.overall_band}</span>
        </div>
        <span
          className="text-lg font-bold font-mono tabular-nums px-3 py-0.5 rounded-full border"
          style={{ color: deltaColor(dOverall), borderColor: deltaColor(dOverall) + '55' }}
        >
          {fmtDelta(dOverall)}
        </span>
        <span className="text-base text-navy-300">
          {dOverall > 0
            ? 'Band tổng đi lên. Giữ nhịp này.'
            : dOverall < 0
              ? 'Band tổng thấp hơn lần trước — xem bốn tiêu chí bên dưới để biết rơi ở đâu.'
              : 'Band tổng giữ nguyên. Nhìn từng tiêu chí để thấy chỗ đã dịch chuyển.'}
        </span>
      </div>

      {/* Bốn tiêu chí */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-navy-700/50">
        {CRITERIA.map(c => {
          const p = prev[c.key];
          const cur = current[c.key];
          if (p == null || cur == null) return null;
          const d = cur - p;
          return (
            <div key={c.key} className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: c.color }}>
                {c.label}
              </div>
              <div className="font-mono tabular-nums text-base text-navy-300">
                {p} <span className="text-navy-600">→</span>{' '}
                <span className="text-white font-semibold">{cur}</span>
              </div>
              <div className="text-sm font-mono font-bold tabular-nums" style={{ color: deltaColor(d) }}>
                {fmtDelta(d)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Số lỗi được đánh dấu */}
      {dErrors !== null && (
        <div className="mt-4 pt-4 border-t border-navy-700/50 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono text-navy-500 uppercase tracking-wider">Lỗi được đánh dấu</span>
          <span className="font-mono tabular-nums text-base text-navy-300">
            {prevErrors} <span className="text-navy-600">→</span>{' '}
            <span className="text-white font-semibold">{current.error_count}</span>
          </span>
          <span
            className="text-sm font-bold font-mono tabular-nums"
            style={{ color: deltaColor(-dErrors) }}
          >
            {dErrors === 0 ? '—' : (dErrors < 0 ? '−' : '+') + Math.abs(dErrors)}
          </span>
        </div>
      )}
    </div>
  );
}
