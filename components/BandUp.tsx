'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * <BandUpCelebration> — Lễ thăng band.
 * Hiện khi band bài vừa chấm vượt kỷ lục cũ của học viên.
 * Kèm nút "Lưu khoảnh khắc": xuất ảnh 1080×1080 để chia sẻ mạng xã hội.
 */
export function BandUpCelebration({ band }: { band: number }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

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
        const prior = rows.slice(1);
        if (prior.length >= 1 && band > Math.max(...prior)) {
          timer = setTimeout(() => setShow(true), 2400);
        }
      } catch { /* lễ nghi không được làm hỏng phiếu chấm */ }
    })();
    return () => { if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band]);

  async function saveMoment() {
    if (saving) return;
    setSaving(true);
    try {
      await document.fonts.ready;
      const c = document.createElement('canvas');
      c.width = 1080; c.height = 1080;
      const x = c.getContext('2d')!;
      const bg = x.createLinearGradient(0, 0, 0, 1080);
      bg.addColorStop(0, '#1A234E'); bg.addColorStop(1, '#0E1434');
      x.fillStyle = bg; x.fillRect(0, 0, 1080, 1080);
      x.strokeStyle = 'rgba(200,161,75,.65)'; x.lineWidth = 6;
      x.strokeRect(40, 40, 1000, 1000);
      x.strokeStyle = 'rgba(200,161,75,.28)'; x.lineWidth = 2;
      x.strokeRect(58, 58, 964, 964);
      try {
        const img = new Image();
        img.src = '/favicon.svg';
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        x.drawImage(img, 478, 120, 124, 124);
      } catch { /* crest optional */ }
      x.textAlign = 'center';
      x.fillStyle = 'rgba(231,206,142,.85)';
      x.font = '600 36px "EB Garamond", serif';
      x.fillText('K Ỷ  L Ụ C  B A N D  M Ớ I', 540, 330);
      const gold = x.createLinearGradient(0, 380, 0, 640);
      gold.addColorStop(0, '#F4E7BC'); gold.addColorStop(.45, '#C8A14B'); gold.addColorStop(1, '#8A6A28');
      x.fillStyle = gold;
      x.font = '900 270px "Cinzel", "Cormorant Garamond", serif';
      x.fillText(band.toFixed(1), 540, 620);
      x.fillStyle = '#E7CE8E';
      x.font = 'italic 50px "Cormorant Garamond", serif';
      x.fillText('“Per te, ad astra” — through you, to the stars', 540, 726);
      x.strokeStyle = 'rgba(200,161,75,.5)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(340, 790); x.lineTo(740, 790); x.stroke();
      x.fillStyle = 'rgba(231,206,142,.95)';
      x.font = '700 44px "Cormorant Garamond", serif';
      x.fillText('WriteRight by UNICOACH', 540, 866);
      x.fillStyle = 'rgba(231,206,142,.55)';
      x.font = '28px "EB Garamond", serif';
      x.fillText('Luyện IELTS Writing cùng mentor AI — writeright-w5r9.vercel.app', 540, 922);
      const a = document.createElement('a');
      a.download = `writeright-band-${band.toFixed(1)}.png`;
      a.href = c.toDataURL('image/png');
      a.click();
    } catch { /* im lặng */ }
    setSaving(false);
  }

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
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-foil bandup-btn" onClick={() => setShow(false)}>Tiếp tục hành trình ✦</button>
          <button onClick={saveMoment} disabled={saving} style={{
            padding: '11px 18px', borderRadius: 10, background: 'none', cursor: 'pointer',
            border: '1px solid rgba(231,206,142,.45)', color: 'var(--champagne)',
            fontFamily: 'var(--font-body)', fontSize: 15,
          }}>{saving ? 'Đang tạo ảnh...' : 'Lưu khoảnh khắc ↓'}</button>
        </div>
      </div>
    </div>
  );
}
