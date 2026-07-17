'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

/**
 * <MentorNote> — Thư từ mentor khi band chững lại.
 * Điều kiện: ≥6 bài và 5 bài gần nhất không vượt kỷ lục trước đó.
 * Đây là khoảnh khắc dễ bỏ cuộc nhất — mentor xuất hiện đúng lúc,
 * chỉ ra tiêu chí đang giữ band và mời đổi cách luyện.
 */

const CRIT: Record<string, { label: string; tip: string }> = {
  ta_band: { label: 'Task Achievement', tip: 'luyện phân tích đề trước khi viết — trả lời đủ mọi vế câu hỏi' },
  cc_band: { label: 'Coherence & Cohesion', tip: 'luyện dàn ý 4 đoạn chuẩn trước, viết sau' },
  lr_band: { label: 'Lexical Resource', tip: 'học lại collocation từ chính phần sửa lỗi của các bài trước' },
  gra_band: { label: 'Grammar & Accuracy', tip: 'viết câu ngắn đúng tuyệt đối trước khi ghép câu phức' },
};

export function MentorNote() {
  const [note, setNote] = useState<null | { band: number; crit: string; tip: string }>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('evaluations')
        .select('overall_band,ta_band,cc_band,lr_band,gra_band')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(12);
      const rows = data || [];
      if (rows.length < 6) return;
      const last5 = rows.slice(0, 5).map((r) => Number(r.overall_band));
      const earlier = rows.slice(5).map((r) => Number(r.overall_band));
      if (Math.max(...last5) > Math.max(...earlier)) return; // vẫn đang tiến — không cần thư
      const crits = (['ta_band', 'cc_band', 'lr_band', 'gra_band'] as const).map((k) => ({
        k, v: rows.slice(0, 5).reduce((s, r) => s + Number(r[k] || 0), 0) / 5,
      })).sort((a, b) => a.v - b.v);
      const w = crits[0];
      setNote({
        band: Math.round((last5.reduce((a, b) => a + b, 0) / 5) * 10) / 10,
        crit: CRIT[w.k].label,
        tip: CRIT[w.k].tip,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!note) return null;
  return (
    <div style={{
      background: 'linear-gradient(170deg,#1A234E,#0E1434)', border: '1px solid rgba(200,161,75,.35)',
      borderRadius: 12, padding: '18px 20px', marginBottom: 32, boxShadow: 'var(--shadow-card)',
    }}>
      <div className="eyebrow" style={{ color: 'var(--champagne)', marginBottom: 10 }}>Thư từ mentor</div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: 'rgba(231,206,142,.9)', lineHeight: 1.65, margin: '0 0 12px' }}>
        5 bài gần nhất của bạn đang giữ nhịp quanh band {note.band.toFixed(1)}. Điểm chững không có nghĩa là bạn
        kém đi — nó có nghĩa là cách luyện hiện tại đã hết dư địa. Thứ đang giữ bạn lại là{' '}
        <strong style={{ color: 'var(--champagne)' }}>{note.crit}</strong>: hãy {note.tip}, thay vì chỉ viết thêm bài.
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Link href="/courses" className="app-nav-link" style={{ color: 'var(--imperial-gold)', fontWeight: 600 }}>
          Xem lộ trình khóa học →
        </Link>
        <a href="mailto:phanvandiep2014@gmail.com?subject=T%C6%B0%20v%E1%BA%A5n%20l%E1%BB%99%20tr%C3%ACnh%20IELTS%20Writing" className="app-nav-link">
          Hỏi mentor UNICOACH
        </a>
      </div>
    </div>
  );
}
