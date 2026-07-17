'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { RoyalIcon } from '@/components/RoyalIcons';

/**
 * <HonorBoard> — Bảng danh dự trên profile (nền parchment).
 * Huy hiệu heraldic tính trực tiếp từ dữ liệu thật — không cần bảng riêng.
 */

type Badge = { key: string; icon: string; name: string; desc: string; earned: boolean };

export function HonorBoard() {
  const [badges, setBadges] = useState<Badge[] | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [eRes, sRes] = await Promise.all([
        supabase.from('evaluations').select('overall_band')
          .eq('user_id', user.id).order('created_at', { ascending: true }).limit(200),
        supabase.from('user_streaks').select('current_streak,longest_streak')
          .eq('user_id', user.id).maybeSingle(),
      ]);
      const rows = (eRes.data || []).map((r) => Number(r.overall_band)).filter(Boolean);
      const longest = sRes.data?.longest_streak ?? 0;
      const total = rows.length;
      const first = rows[0] ?? 0;
      const best = rows.length ? Math.max(...rows) : 0;
      setBadges([
        { key: 'khaibut', icon: 'quill', name: 'Khai bút', desc: 'Nộp bài viết đầu tiên', earned: total >= 1 },
        { key: 'densach', icon: 'candle', name: 'Đèn sách', desc: 'Chuỗi 3 ngày viết liên tục', earned: longest >= 3 },
        { key: 'nguyetque', icon: 'laurel', name: 'Nhành nguyệt quế', desc: 'Chuỗi 7 ngày viết liên tục', earned: longest >= 7 },
        { key: 'tinhtu', icon: 'star', name: 'Tinh tú', desc: 'Vượt band khởi điểm +0.5', earned: total >= 2 && best >= first + 0.5 },
        { key: 'butvang', icon: 'scroll', name: 'Bút lông vàng', desc: 'Hoàn thành 10 bài luyện', earned: total >= 10 },
        { key: 'anhocgia', icon: 'progress', name: 'Ấn học giả', desc: 'Đạt bài viết band 7.0+', earned: best >= 7 },
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!badges) return null;
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 11, color: '#9c8657',
        textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        Bảng danh dự
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
        <span style={{ color: '#5a4a3a' }}>{earnedCount}/{badges.length} huy hiệu</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {badges.map((b) => (
          <div key={b.key} title={b.desc} style={{
            background: b.earned ? '#FBF7EE' : 'rgba(0,0,0,.025)',
            border: b.earned ? '1px solid rgba(200,161,75,.55)' : '1px solid rgba(0,0,0,.08)',
            borderRadius: 10, padding: '14px 12px', textAlign: 'center',
            boxShadow: b.earned ? '0 4px 14px rgba(200,161,75,.14)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, filter: b.earned ? 'none' : 'grayscale(1) opacity(.45)' }}>
              <RoyalIcon name={b.icon} size={26} color={b.earned ? 'var(--imperial-gold)' : '#9c8657'} />
            </div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 14.5, color: b.earned ? '#241B10' : 'rgba(36,27,16,.45)' }}>{b.name}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: b.earned ? '#5a4a3a' : 'rgba(90,74,58,.5)', marginTop: 3, lineHeight: 1.4 }}>{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
