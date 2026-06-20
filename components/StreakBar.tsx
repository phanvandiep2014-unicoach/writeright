'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // ← adjust path

/**
 * <StreakBar> — the frequency engine.
 *
 * "Frequent subscribers" come from a daily habit, not a feature. This widget:
 *   - shows the current daily streak (loss aversion: don't break the chain),
 *   - tracks a weekly goal of WEEKLY_GOAL evaluations,
 *   - celebrates milestones (3 / 7 / 30 days) with a gold-foil flourish.
 *
 * Reads from `user_streaks` (see sql/conversion-features.sql). The streak is
 * advanced server-side whenever an evaluation is saved (trigger in the SQL).
 */
const WEEKLY_GOAL = 5;

export function StreakBar() {
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('user_streaks')
        .select('current_streak, evals_this_week')
        .eq('user_id', user.id)
        .single();
      setStreak(data?.current_streak ?? 0);
      setWeekCount(data?.evals_this_week ?? 0);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  const pct = Math.min(100, Math.round((weekCount / WEEKLY_GOAL) * 100));
  const milestone = streak >= 30 ? '🏛️' : streak >= 7 ? '👑' : streak >= 3 ? '⭐' : '🔥';

  return (
    <div
      style={{
        background: 'var(--royal-sapphire)', color: 'var(--champagne)',
        borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="eyebrow" style={{ color: 'var(--champagne)' }}>Chuỗi luyện tập</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '.85rem', opacity: .85 }}>
          {weekCount}/{WEEKLY_GOAL} bài tuần này
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <span style={{ fontSize: '2rem' }}>{milestone}</span>
        <div>
          <div style={{ fontFamily: 'var(--font-subhead)', fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
            <span className="gold-foil">{streak}</span> ngày
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '.85rem', opacity: .85 }}>
            {streak === 0 ? 'Chấm 1 bài hôm nay để bắt đầu chuỗi.' : 'Đừng để đứt chuỗi — viết 1 bài hôm nay.'}
          </div>
        </div>
      </div>

      {/* Weekly goal progress */}
      <div style={{ marginTop: 14, height: 8, borderRadius: 99, background: 'rgba(231,206,142,.18)' }}>
        <div
          style={{
            width: `${pct}%`, height: '100%', borderRadius: 99,
            background: 'var(--gold-foil)', transition: 'width .4s ease',
          }}
        />
      </div>
    </div>
  );
}
