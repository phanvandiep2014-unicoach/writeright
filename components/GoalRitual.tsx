'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * <GoalRitual> — nghi thức "Khai bút" + Lộ trình cá nhân.
 *
 * Chưa có mục tiêu  → modal 3 câu hỏi (band hiện tại, band mục tiêu, ngày thi).
 * Đã có mục tiêu    → thanh lộ trình: current → target, vị trí hiện tại theo
 *                     band trung bình 10 bài gần nhất, số ngày còn lại, số bài ước tính.
 * "Bắt đầu từ bạn" — mọi trải nghiệm sau đó neo vào đích đến này.
 */

type Goal = { current_band: number; target_band: number; exam_date: string | null };

const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5];
const ESSAYS_PER_HALF_BAND = 12;

const selStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  background: '#0E1434', color: 'var(--champagne)',
  border: '1px solid rgba(200,161,75,.35)',
  fontFamily: 'var(--font-body)', fontSize: 15,
};
const lblStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-body)', fontSize: 13,
  letterSpacing: '.06em', textTransform: 'uppercase',
  color: 'rgba(231,206,142,.7)', margin: '14px 0 6px',
};

export function GoalRitual() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [avgBand, setAvgBand] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(5.5);
  const [target, setTarget] = useState(6.5);
  const [examDate, setExamDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [gRes, eRes] = await Promise.all([
        supabase.from('user_goals').select('current_band,target_band,exam_date')
          .eq('user_id', user.id).maybeSingle(),
        supabase.from('evaluations').select('overall_band')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      if (gRes.data) {
        setGoal(gRes.data as Goal);
        setCur(Number(gRes.data.current_band));
        setTarget(Number(gRes.data.target_band));
        setExamDate(gRes.data.exam_date || '');
      } else if (!sessionStorage.getItem('wr_goal_skip')) {
        setOpen(true);
      }
      const bands = (eRes.data || []).map((r) => Number(r.overall_band)).filter(Boolean);
      if (bands.length) setAvgBand(Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const row = {
      user_id: user.id,
      current_band: cur,
      target_band: Math.max(target, cur + 0.5),
      exam_date: examDate || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('user_goals').upsert(row);
    if (!error) {
      setGoal({ current_band: row.current_band, target_band: row.target_band, exam_date: row.exam_date });
      setOpen(false);
    }
    setSaving(false);
  }

  function skip() {
    sessionStorage.setItem('wr_goal_skip', '1');
    setOpen(false);
  }

  if (loading) return null;

  // ── Modal Khai bút ──
  const modal = open ? (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(10,14,36,.85)', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 430, background: 'linear-gradient(170deg,#1A234E,#0E1434)',
        border: '1px solid rgba(200,161,75,.45)', borderRadius: 12, padding: '30px 28px',
        boxShadow: '0 24px 70px rgba(0,0,0,.55)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <img src="/favicon.svg" alt="" width={44} height={44} />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 24,
          color: 'var(--ivory)', textAlign: 'center', margin: '8px 0 4px',
        }}>Khai bút</h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'rgba(231,206,142,.75)',
          textAlign: 'center', margin: '0 0 10px', lineHeight: 1.5,
        }}>Bắt đầu từ bạn — cho mentor biết đích đến, mọi phiếu chấm sẽ hướng về đó.</p>

        <label style={lblStyle}>Band hiện tại của bạn (ước lượng)</label>
        <select style={selStyle} value={cur} onChange={(e) => setCur(Number(e.target.value))}>
          {BANDS.map((b) => <option key={b} value={b}>{b.toFixed(1)}</option>)}
        </select>

        <label style={lblStyle}>Band mục tiêu</label>
        <select style={selStyle} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
          {BANDS.filter((b) => b > cur).concat([9]).map((b) => <option key={b} value={b}>{b.toFixed(1)}</option>)}
        </select>

        <label style={lblStyle}>Ngày thi dự kiến (không bắt buộc)</label>
        <input type="date" style={selStyle} value={examDate} onChange={(e) => setExamDate(e.target.value)} />

        <button onClick={save} disabled={saving} className="btn-foil" style={{
          width: '100%', padding: '12px 0', borderRadius: 10, marginTop: 22,
          fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, cursor: 'pointer',
        }}>{saving ? 'Đang ghi vào sổ...' : '✦ Bắt đầu hành trình'}</button>

        <button onClick={skip} style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'rgba(231,206,142,.5)', marginTop: 12,
        }}>Để sau</button>
      </div>
    </div>
  ) : null;

  // ── Thanh lộ trình ──
  if (!goal) return modal;

  const base = Math.max(avgBand ?? goal.current_band, goal.current_band);
  const span = Math.max(goal.target_band - goal.current_band, 0.5);
  const pct = Math.min(100, Math.max(4, Math.round(((base - goal.current_band) / span) * 100)));
  const essaysLeft = Math.max(0, Math.round(((goal.target_band - base) / 0.5) * ESSAYS_PER_HALF_BAND));
  const daysLeft = goal.exam_date
    ? Math.ceil((new Date(goal.exam_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      {modal}
      <div style={{
        background: '#161E48', border: '1px solid rgba(200,161,75,.25)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 16, boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span className="eyebrow" style={{ color: 'var(--champagne)' }}>
            Lộ trình của bạn — {goal.current_band.toFixed(1)} → <span className="gold-foil" style={{ fontWeight: 700 }}>{goal.target_band.toFixed(1)}</span>
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.85rem', color: 'rgba(231,206,142,.8)' }}>
            {daysLeft !== null && daysLeft >= 0 ? `còn ${daysLeft} ngày · ` : ''}
            {essaysLeft > 0 ? `≈ ${essaysLeft} bài luyện nữa` : 'bạn đã chạm mốc mục tiêu ✦'}
            <button onClick={() => setOpen(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer', marginLeft: 10,
              fontFamily: 'var(--font-body)', fontSize: '.8rem', color: 'rgba(200,161,75,.7)',
            }}>sửa</button>
          </span>
        </div>
        <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 99, marginTop: 12 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', borderRadius: 99,
            background: 'linear-gradient(90deg,#8A6A28,#E7CE8E 40%,#C8A14B 70%,#A9863A)',
          }} />
          <div title={avgBand !== null ? `Band trung bình gần đây: ${avgBand}` : ''} style={{
            position: 'absolute', left: `calc(${pct}% - 7px)`, top: -3, width: 14, height: 14,
            borderRadius: '50%', background: 'var(--champagne)', border: '2px solid #8A6A28',
          }} />
        </div>
        {avgBand !== null && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '.8rem', color: 'rgba(231,206,142,.55)', marginTop: 8 }}>
            Vị trí hiện tại tính theo band trung bình 10 bài gần nhất: {avgBand.toFixed(1)}
          </div>
        )}
      </div>
    </>
  );
}
