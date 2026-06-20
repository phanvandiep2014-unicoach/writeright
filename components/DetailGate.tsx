'use client';
import { ReactNode } from 'react';
import { useEntitlement } from '@/hooks/useEntitlement';

/**
 * <DetailGate> wraps the part of the result a free user must NOT see in full:
 * the 4-criteria breakdown, inline corrections, rewrite loop.
 *
 * Free users see their overall band above this gate (always free), then hit
 * the blurred breakdown with a single, well-timed upgrade ask. This is the
 * moment of maximum desire — they have a score and want to know how to raise it.
 */
export function DetailGate({
  children,
  onUpgrade,
}: {
  children: ReactNode;
  onUpgrade: () => void;
}) {
  const { canSeeDetail, loading } = useEntitlement();

  if (loading) return <div style={{ minHeight: 120 }} />;
  if (canSeeDetail) return <>{children}</>;

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      {/* Real content, blurred — proof there's something valuable behind the gate */}
      <div
        aria-hidden
        style={{ filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.7 }}
      >
        {children}
      </div>

      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14,
          textAlign: 'center', padding: 24,
          background:
            'linear-gradient(180deg, rgba(244,236,216,0) 0%, rgba(244,236,216,.55) 35%, var(--parchment) 80%)',
        }}
      >
        <span className="eyebrow">Phân tích chi tiết</span>
        <p
          className="heading-vi"
          style={{ fontSize: '1.35rem', maxWidth: 420, margin: 0 }}
        >
          Mở khoá điểm từng tiêu chí, lỗi sai inline và vòng viết lại để{' '}
          <span className="gold-foil">tăng band</span>.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', maxWidth: 380, margin: 0 }}>
          Bạn đã thấy band tổng. Bản nâng cấp cho bạn biết <em>tại sao</em> và{' '}
          <em>sửa thế nào</em> — phần giúp điểm thật sự đi lên.
        </p>
        <button className="btn-royal" onClick={onUpgrade}>
          Mở khoá chi tiết — từ 90.000đ
        </button>
        <small style={{ fontFamily: 'var(--font-body)', color: 'var(--royal-oxblood)' }}>
          Học viên UNICOACH dùng mã lớp được ưu đãi riêng.
        </small>
      </div>
    </div>
  );
}

/**
 * <QuotaBanner> — shown above the editor for free users. Counts down their free
 * evaluations and turns the scarcity into a gentle, recurring upgrade prompt.
 */
export function QuotaBanner({ onUpgrade }: { onUpgrade: () => void }) {
  const { isPaid, freeLeft, loading } = useEntitlement();
  if (loading || isPaid) return null;

  const out = freeLeft === 0;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
        background: 'var(--ivory)', border: 'var(--hairline)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 16,
      }}
    >
      <span style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)' }}>
        {out
          ? 'Bạn đã dùng hết lượt chấm miễn phí tuần này.'
          : `Còn ${freeLeft} lượt chấm miễn phí tuần này.`}
      </span>
      <button
        className={out ? 'btn-royal' : 'btn-ghost'}
        style={{ padding: '.5rem 1rem', fontSize: '.95rem' }}
        onClick={onUpgrade}
      >
        {out ? 'Nâng cấp để chấm không giới hạn' : 'Xem gói nâng cấp'}
      </button>
    </div>
  );
}
