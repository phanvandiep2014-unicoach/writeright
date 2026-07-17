'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * <WeeklyReport> — Học bạ tuần.
 * Lá thư parchment giữa dashboard tối: số bài, band trung bình tuần
 * (so với tuần trước), tiêu chí cần chú tâm và một việc trọng tâm.
 * Tính theo tuần Thứ Hai, múi giờ Việt Nam.
 */

type Row = { overall_band: number; ta_band: number; cc_band: number; lr_band: number; gra_band: number; created_at: string };

const CRIT_META: Record<string, { label: string; focus: string }> = {
  ta_band: { label: 'Task Achievement', focus: 'Trả lời đúng và đủ mọi vế của đề — gạch chân từ khóa đề trước khi viết.' },
  cc_band: { label: 'Coherence & Cohesion', focus: 'Mỗi đoạn một ý chính, mở đoạn bằng topic sentence rõ ràng.' },
  lr_band: { label: 'Lexical Resource', focus: 'Học 5 collocation mỗi ngày lấy từ chính phần sửa lỗi của bạn.' },
  gra_band: { label: 'Grammar & Accuracy', focus: 'Viết chậm lại — ưu tiên câu đúng trước khi thử câu phức.' },
};

function vnDate(d: Date): Date {
  return new Date(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) + 'T00:00:00Z');
}
function mondayOf(d: Date): Date {
  const x = vnDate(d);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}
const fmt = (d: Date) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);

export function WeeklyReport() {
  const [state, setState] = useState<null | {
    weekLabel: string; count: number; lastCount: number;
    band: number | null; lastBand: number | null;
    weak: { label: string; band: number; focus: string } | null;
  }>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('evaluations')
        .select('overall_band,ta_band,cc_band,lr_band,gra_band,created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(80);
      const rows = (data || []) as Row[];
      const now = new Date();
      const thisMon = mondayOf(now);
      const lastMon = new Date(thisMon); lastMon.setUTCDate(lastMon.getUTCDate() - 7);
      const sunEnd = new Date(thisMon); sunEnd.setUTCDate(sunEnd.getUTCDate() + 6);
      const inWeek = (r: Row, mon: Date) => {
        const d = vnDate(new Date(r.created_at));
        const end = new Date(mon); end.setUTCDate(end.getUTCDate() + 7);
        return d >= mon && d < end;
      };
      const cur = rows.filter((r) => inWeek(r, thisMon));
      const prev = rows.filter((r) => inWeek(r, lastMon));
      let weak: { label: string; band: number; focus: string } | null = null;
      const pool = cur.length ? cur : rows.slice(0, 10);
      if (pool.length) {
        const crits = (Object.keys(CRIT_META) as (keyof Row)[]).map((k) => ({
          k: k as string,
          v: avg(pool.map((r) => Number(r[k])).filter(Boolean)) ?? 9,
        })).sort((a, b) => a.v - b.v);
        const w = crits[0];
        if (w && w.v < 9) weak = { label: CRIT_META[w.k].label, band: w.v, focus: CRIT_META[w.k].focus };
      }
      setState({
        weekLabel: `${fmt(thisMon)} – ${fmt(sunEnd)}`,
        count: cur.length, lastCount: prev.length,
        band: avg(cur.map((r) => Number(r.overall_band))),
        lastBand: avg(prev.map((r) => Number(r.overall_band))),
        weak,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;
  const delta = state.band !== null && state.lastBand !== null
    ? Math.round((state.band - state.lastBand) * 10) / 10 : null;

  const label: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9c8657' };
  const value: React.CSSProperties = { fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 26, color: '#241B10', lineHeight: 1.2 };

  return (
    <div style={{
      background: '#F4ECD8', border: '1px solid rgba(138,106,40,.35)', borderRadius: 12,
      padding: '20px 22px', marginBottom: 32, boxShadow: 'var(--shadow-card)', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 19, color: '#241B10' }}>Học bạ tuần</span>
        <span style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 14, color: '#5a4a3a' }}>{state.weekLabel}</span>
      </div>
      {state.count === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#5a4a3a', margin: 0, lineHeight: 1.6 }}>
          Trang học bạ tuần này còn trắng. Thắp đèn bằng một bài viết hôm nay nhé — mentor đang chờ bài của bạn.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={label}>Bài đã nộp</div>
              <div style={value}>{state.count}<span style={{ fontSize: 14, fontWeight: 600, color: '#5a4a3a' }}> {state.lastCount ? `(tuần trước ${state.lastCount})` : ''}</span></div>
            </div>
            <div>
              <div style={label}>Band trung bình tuần</div>
              <div style={value}>{state.band?.toFixed(1)}
                {delta !== null && delta !== 0 && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: delta > 0 ? '#123F33' : '#5A1726' }}> {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}</span>
                )}
              </div>
            </div>
            {state.weak && (
              <div>
                <div style={label}>Cần chú tâm</div>
                <div style={{ ...value, fontSize: 17, fontFamily: 'var(--font-subhead)' }}>{state.weak.label} · {state.weak.band.toFixed(1)}</div>
              </div>
            )}
          </div>
          {state.weak && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: '#5a4a3a', margin: 0, lineHeight: 1.6, borderTop: '1px solid rgba(138,106,40,.2)', paddingTop: 12 }}>
              <strong style={{ color: '#241B10' }}>Việc trọng tâm tuần này:</strong> {state.weak.focus}
            </p>
          )}
        </>
      )}
    </div>
  );
}
