'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * <BandUpCelebration> — Lễ thăng band.
 * Hiện khi band bài vừa chấm vượt kỷ lục cũ của học viên.
 * Tự so với lịch sử, chờ con dấu sáp kết thúc rồi mới cử hành.
 */
export function BandUpCelebration({ band }: { band: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('evaluations').select('overall_band')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
        const rows = (data || []).map((r) => Number(r.overall_band)).filter(Boolean);
        const prior = rows.slice(1); // bỏ bài mới nhất — chính là bài này
        if (prior.length >= 1 && band > Math.max(...prior)) {
          timer = setTimeout(() => setShow(true), 2400);
        }
      } catch { /* lễ nghi không được làm hỏng phiếu chấm */ }
    })();
    return () => { if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band]);

  if (!show) return null;
  return (
    <div className="bandup-overlay" onClick={() => setShow(false)}>
      <div className="bandup-card" onClick={(e) => e.stopPropagation()}>
        <svg width="120" height="64" viewBox="0 0 120 64" fill="none" stroke="var(--imperial-gold)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M28 8c-3 18 6 34 32 46M92 8c3 18-6 34-32 46" />
          <path d="M28 8c5 3 9 3 13 1M92 8c-5 3-9 3-13 1M31 20c5 2 8 2 12 0M89 20c-5 2-8 2-12 0M36 31c4 2 7 2 10 0M84 31c-4 2-7 2-10 0M43 42c3 2 6 2 9 0M77 42c-3 2-6 2-9 0" />
        </svg>
        <div className="bandup-band gold-foil">{band.toFixed(1)}</div>
        <div className="bandup-motto">Ad astra!</div>
        <p className="bandup-note">Kỷ lục band mới trên hành trình của bạn. Từ hôm nay, mọi bài viết sẽ so với chính cột mốc này.</p>
        <button className="btn-foil bandup-btn" onClick={() => setShow(false)}>Tiếp tục hành trình ✦</button>
      </div>
    </div>
  );
}
