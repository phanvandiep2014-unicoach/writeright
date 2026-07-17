'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { HonorBoard } from '@/components/HonorBoard';

type Evaluation = {
  id: string;
  task_type: number;
  task_prompt: string;
  overall_band: number;
  ta_band: number;
  lr_band: number;
  gra_band: number;
  cc_band: number;
  word_count: number;
  created_at: string;
  feedback: any;
};

type Plan = 'free' | 'standard' | 'premium';

// ── Inline sparkline (no external deps)
function Sparkline({ bands }: { bands: number[] }) {
  if (bands.length < 2) return null;
  const W = 320, H = 72, PAD = 8;
  const min = Math.max(0, Math.min(...bands) - 0.5);
  const max = Math.min(9, Math.max(...bands) + 0.5);
  const range = max - min || 1;
  const pts = bands.map((b, i) => {
    const x = PAD + (i / (bands.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((b - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8A14B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C8A14B" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* fill area */}
      <polygon
        points={`${PAD},${H} ${pts.join(' ')} ${W - PAD},${H}`}
        fill="url(#sg)"
      />
      {/* line */}
      <polyline points={pts.join(' ')} fill="none" stroke="#C8A14B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* last point dot */}
      <circle cx={last[0]} cy={last[1]} r="4" fill="#C8A14B" />
    </svg>
  );
}

// ── Skill quad (4 avg criteria)
function SkillQuad({ avg }: { avg: { ta: number; lr: number; gra: number; cc: number } }) {
  const items = [
    { key: 'ta',  label: 'Task Achievement',    color: '#11183A', val: avg.ta  },
    { key: 'cc',  label: 'Coherence & Cohesion', color: '#123F33', val: avg.cc  },
    { key: 'lr',  label: 'Lexical Resource',     color: '#5A1726', val: avg.lr  },
    { key: 'gra', label: 'Grammar & Accuracy',   color: '#9A7A2E', val: avg.gra },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {items.map((it) => (
        <div key={it.key} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#9c8657' }}>{it.label}</span>
            <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 22, color: it.color }}>
              {it.val > 0 ? it.val.toFixed(1) : '—'}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: it.color, width: `${(it.val / 9) * 100}%`, transition: 'width .8s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Plan badge
const PLAN_META: Record<Plan, { label: string; color: string; bg: string; border: string }> = {
  free:     { label: 'Miễn phí',  color: '#9c8657', bg: 'rgba(156,134,87,0.12)',  border: 'rgba(156,134,87,0.3)'  },
  standard: { label: 'Standard',  color: '#C8A14B', bg: 'rgba(200,161,75,0.15)',  border: 'rgba(200,161,75,0.4)'  },
  premium:  { label: 'Premium',   color: '#E7CE8E', bg: 'rgba(231,206,142,0.18)', border: 'rgba(231,206,142,0.5)' },
};

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [plan, setPlan] = useState<Plan>('free');
  const [freeLeft, setFreeLeft] = useState(1);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      const [evalsRes, entitleRes, streakRes] = await Promise.all([
        supabase.from('evaluations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('user_entitlements').select('plan, evals_this_week').eq('user_id', user.id).single(),
        supabase.from('user_streaks').select('current_streak').eq('user_id', user.id).single(),
      ]);

      setEvals(evalsRes.data || []);

      const p = (entitleRes.data?.plan as Plan) ?? 'free';
      const used = entitleRes.data?.evals_this_week ?? 0;
      setPlan(p);
      setFreeLeft(Math.max(0, 1 - used));
      setStreak(streakRes.data?.current_streak ?? 0);
      setLoading(false);
    })();
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    window.location.href = '/';
  };

  const handleShare = async (evalId: string) => {
    if (!user) return;
    setSharing(evalId);
    const supabase = createClient();
    const { data: existing } = await supabase.from('shares').select('token').eq('evaluation_id', evalId).eq('user_id', user.id).limit(1).maybeSingle();
    let token = existing?.token;
    if (!token) {
      const { data: created, error } = await supabase.from('shares').insert({ evaluation_id: evalId, user_id: user.id }).select('token').single();
      if (error || !created) { setSharing(null); return; }
      token = created.token;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    setCopiedId(evalId);
    setSharing(null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Derived stats
  const totalEvals = evals.length;
  const avgOverall  = totalEvals > 0 ? evals.reduce((s, e) => s + (e.overall_band || 0), 0) / totalEvals : 0;
  const bestBand    = totalEvals > 0 ? Math.max(...evals.map(e => e.overall_band || 0)) : 0;
  const recentBands = evals.slice(0, 10).map(e => e.overall_band).reverse();
  const avg4 = {
    ta:  totalEvals > 0 ? evals.reduce((s, e) => s + (e.ta_band  || 0), 0) / totalEvals : 0,
    cc:  totalEvals > 0 ? evals.reduce((s, e) => s + (e.cc_band  || 0), 0) / totalEvals : 0,
    lr:  totalEvals > 0 ? evals.reduce((s, e) => s + (e.lr_band  || 0), 0) / totalEvals : 0,
    gra: totalEvals > 0 ? evals.reduce((s, e) => s + (e.gra_band || 0), 0) / totalEvals : 0,
  };

  const planMeta = PLAN_META[plan];
  const memberSince = user ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : '';
  const streakIcon = streak >= 30 ? '🏛️' : streak >= 7 ? '👑' : streak >= 3 ? '⭐' : '🔥';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-10 h-10 border-t-brand-500 rounded-full animate-spin-slow" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#C8A14B' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(17,24,58,.97)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(200,161,75,.2)'
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 18, color: 'var(--champagne)', textDecoration: 'none' }}>
            Write<span style={{ color: 'var(--imperial-gold)' }}>Right</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/evaluate" style={{
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
              background: 'var(--imperial-gold)', color: '#0A0E24',
              padding: '8px 16px', borderRadius: 8, textDecoration: 'none'
            }}>+ Chấm bài mới</Link>
            <button onClick={logout} style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#5a4a3a', background: 'none', border: 'none', cursor: 'pointer' }}>Đăng xuất</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Profile Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #161E48 0%, #0A0E24 100%)',
          border: '1px solid rgba(200,161,75,.25)', borderRadius: 16,
          padding: '32px', marginBottom: 28, position: 'relative', overflow: 'hidden'
        }}>
          {/* background glow */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,161,75,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(200,161,75,0.4)', display: 'block' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(200,161,75,0.4)', background: 'rgba(200,161,75,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--imperial-gold)', fontFamily: 'var(--font-wordmark)' }}>
                  {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
              )}
              {/* streak badge */}
              {streak > 0 && (
                <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#1B2552', border: '2px solid rgba(200,161,75,0.4)', borderRadius: 12, padding: '2px 7px', fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--champagne)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {streakIcon} {streak}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 22, color: 'var(--ivory)', margin: 0 }}>
                  {user?.user_metadata?.full_name || 'Writer'}
                </h1>
                {/* plan badge */}
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                  letterSpacing: '.08em', textTransform: 'uppercase',
                  color: planMeta.color, background: planMeta.bg,
                  border: `1px solid ${planMeta.border}`,
                  padding: '3px 10px', borderRadius: 20
                }}>{planMeta.label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9c8657', marginBottom: 4 }}>
                {user?.email}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#5a4a3a' }}>
                Thành viên từ {memberSince}
              </div>
            </div>

            {/* Quota / upgrade */}
            <div style={{ flexShrink: 0 }}>
              {plan === 'free' ? (
                <div style={{ background: 'rgba(200,161,75,0.08)', border: '1px solid rgba(200,161,75,0.2)', borderRadius: 10, padding: '14px 18px', textAlign: 'center', minWidth: 140 }}>
                  <div style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 28, color: 'var(--imperial-gold)', lineHeight: 1 }}>{freeLeft}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#9c8657', marginTop: 4, marginBottom: 12 }}>lượt chấm tuần này</div>
                  <Link href="/pricing" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: '#0A0E24', background: 'var(--imperial-gold)', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                    Nâng cấp →
                  </Link>
                </div>
              ) : (
                <div style={{ background: 'rgba(200,161,75,0.08)', border: '1px solid rgba(200,161,75,0.2)', borderRadius: 10, padding: '14px 18px', textAlign: 'center', minWidth: 140 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>✦</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: planMeta.color, fontWeight: 600 }}>Chấm không giới hạn</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Tổng bài chấm', value: totalEvals || '—', sub: 'bài' },
            { label: 'Band trung bình', value: avgOverall > 0 ? avgOverall.toFixed(1) : '—', sub: '' },
            { label: 'Band cao nhất', value: bestBand || '—', sub: '' },
            { label: 'Chuỗi luyện tập', value: streak > 0 ? `${streakIcon} ${streak}` : '—', sub: 'ngày' },
          ].map((s) => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '18px 16px', textAlign: 'center'
            }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#5a4a3a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 28, color: 'var(--imperial-gold)', lineHeight: 1 }}>{s.value}</div>
              {s.sub && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#5a4a3a', marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>

          {/* ── Sparkline ── */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#9c8657', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
              Xu hướng Band (10 bài gần nhất)
            </div>
            {recentBands.length > 1 ? (
              <>
                <Sparkline bands={recentBands} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 10, color: '#5a4a3a', marginTop: 6 }}>
                  <span>Cũ nhất</span><span>Mới nhất</span>
                </div>
              </>
            ) : (
              <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 13, color: '#5a4a3a' }}>
                Cần ít nhất 2 bài để hiển thị
              </div>
            )}
          </div>

          {/* ── Skill Breakdown ── */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#9c8657', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
              Điểm trung bình 4 tiêu chí
            </div>
            {totalEvals > 0 ? (
              <SkillQuad avg={avg4} />
            ) : (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 13, color: '#5a4a3a' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* ── Bảng danh dự ── */}
        <HonorBoard />

        {/* ── Evaluation History ── */}
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#9c8657', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          Lịch sử chấm bài
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ color: '#5a4a3a' }}>{totalEvals} bài</span>
        </div>

        {evals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
            <p style={{ fontFamily: 'var(--font-subhead)', fontSize: 18, color: 'var(--ivory)', marginBottom: 8 }}>Bắt đầu hành trình Writing</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#9c8657', marginBottom: 24 }}>Nộp bài luận đầu tiên để nhận phân tích chi tiết</p>
            <Link href="/evaluate" style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
              background: 'var(--imperial-gold)', color: '#0A0E24',
              padding: '12px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-block'
            }}>Chấm bài đầu tiên →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evals.map((ev) => {
              const isOpen = selected === ev.id;
              const date = new Date(ev.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const bandColor = ev.overall_band >= 7 ? '#123F33' : ev.overall_band >= 5.5 ? '#C8A14B' : '#9A7A2E';
              return (
                <div
                  key={ev.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isOpen ? 'rgba(200,161,75,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 12, overflow: 'hidden', transition: 'border-color .2s'
                  }}
                >
                  {/* Row */}
                  <button
                    onClick={() => setSelected(isOpen ? null : ev.id)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 18px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    {/* Band circle */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${bandColor}22`, background: `${bandColor}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 18, color: bandColor, lineHeight: 1 }}>{ev.overall_band}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: '#C8A14B', background: 'rgba(200,161,75,0.12)', padding: '2px 8px', borderRadius: 4, letterSpacing: '.05em' }}>
                          TASK {ev.task_type}
                        </span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#5a4a3a' }}>{date}</span>
                        {ev.word_count && <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#5a4a3a' }}>· {ev.word_count} từ</span>}
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#cdbb8e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.task_prompt || '(Không có đề bài)'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(ev.id); }}
                        disabled={sharing === ev.id}
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: 11,
                          color: copiedId === ev.id ? '#123F33' : '#9c8657',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          padding: '5px 12px', borderRadius: 6, cursor: 'pointer', transition: 'all .2s'
                        }}
                      >
                        {copiedId === ev.id ? '✓ Đã copy' : sharing === ev.id ? '...' : '🔗 Chia sẻ'}
                      </button>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#5a4a3a' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded criteria */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                      {[
                        { label: 'TA', band: ev.ta_band,  color: '#11183A' },
                        { label: 'CC', band: ev.cc_band,  color: '#123F33' },
                        { label: 'LR', band: ev.lr_band,  color: '#5A1726' },
                        { label: 'GR', band: ev.gra_band, color: '#9A7A2E' },
                      ].map((c) => (
                        <div key={c.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 22, color: c.color }}>{c.band || '—'}</div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#5a4a3a', letterSpacing: '.06em', marginTop: 2 }}>{c.label}</div>
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 6, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: c.color, width: `${((c.band || 0) / 9) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
