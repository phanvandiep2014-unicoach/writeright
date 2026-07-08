'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  taskType: number;
  taskPrompt: string | null;
  wordCount: number;
  overallBand: number;
  taBand: number;
  ccBand: number;
  lrBand: number;
  graBand: number;
  createdAt: string;
  existingShareToken?: string | null;
};

// EvalCard — evaluation history card.
// • Click anywhere on card → navigate to /e/[token] (full detail)
// • "Chia sẻ" button → get/create share token → copy URL to clipboard

export function EvalCard({
  id, taskType, taskPrompt, wordCount, overallBand,
  taBand, ccBand, lrBand, graBand, createdAt, existingShareToken,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState(existingShareToken || '');
  const [sharing, setSharing] = useState<'idle'|'loading'|'copied'|'error'>('idle');

  async function getToken(): Promise<string> {
    if (token) return token;
    const r = await fetch('/api/share-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluationId: id }),
    });
    const d = await r.json();
    if (d.token) { setToken(d.token); return d.token; }
    throw new Error(d.error || 'failed');
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (sharing === 'loading') return;
    setSharing('loading');
    try {
      const t = await getToken();
      const url = `${window.location.origin}/e/${t}`;
      await navigator.clipboard.writeText(url);
      setSharing('copied');
      setTimeout(() => setSharing('idle'), 2500);
    } catch {
      setSharing('error');
      setTimeout(() => setSharing('idle'), 2000);
    }
  }

  async function handleCardClick() {
    try {
      const t = await getToken();
      router.push(`/e/${t}`);
    } catch { /* fallback */ }
  }

  const shareLabel = { idle: '🔗 Chia sẻ', loading: '...', copied: '✓ Đã copy!', error: 'Thử lại' }[sharing];

  const date = new Date(createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'numeric', year: 'numeric' });

  // Criterion colours aligned with brand (same as evaluate/page.tsx criteria)
  const CRIT_COLORS: Record<string, string> = {
    TA: '#11183A',   // Royal Sapphire
    CC: '#123F33',   // Forest Emerald
    LR: '#5A1726',   // Oxblood
    GR: '#9A7A2E',   // Dark gold-muted
  };
  const CRIT_BG: Record<string, string> = {
    TA: 'rgba(17,24,58,.90)',
    CC: 'rgba(18,63,51,.90)',
    LR: 'rgba(90,23,38,.90)',
    GR: 'rgba(154,122,46,.90)',
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'rgba(255,255,255,.045)',
        border: '1px solid rgba(200,161,75,.18)',
        borderRadius: 16,
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'border-color .18s, background .18s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,161,75,.38)';
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.07)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,161,75,.18)';
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.045)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>

        {/* Left — meta + prompt + criterion bars */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Task badge + date + word count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '.72rem', letterSpacing: '.1em',
              textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
              background: 'rgba(200,161,75,.12)', border: '1px solid rgba(200,161,75,.3)',
              color: '#E7CE8E',
            }}>Task {taskType}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '.82rem', color: 'rgba(231,206,142,.55)' }}>{date}</span>
            {wordCount > 0 && (
              <>
                <span style={{ color: 'rgba(231,206,142,.25)', fontSize: '.8rem' }}>·</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '.82rem', color: 'rgba(231,206,142,.45)' }}>{wordCount} từ</span>
              </>
            )}
          </div>

          {taskPrompt && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '.95rem', lineHeight: 1.55,
              color: 'rgba(231,206,142,.8)', margin: '0 0 14px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{taskPrompt}</p>
          )}

          {/* Criterion bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {([['TA', taBand], ['CC', ccBand], ['LR', lrBand], ['GR', graBand]] as [string, number][]).map(([k, v]) => (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '.72rem', letterSpacing: '.08em', color: 'rgba(231,206,142,.5)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-subhead)', fontSize: '.8rem', fontWeight: 700, color: 'rgba(231,206,142,.8)' }}>{v}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, transition: 'width .6s ease',
                    width: `${((Number(v) || 0) / 9) * 100}%`,
                    background: 'linear-gradient(90deg,#8A6A28,#E7CE8E 50%,#C8A14B)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — overall band + actions */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, minWidth: 88 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontFamily: 'var(--font-subhead)', fontWeight: 700,
              fontSize: 'clamp(32px,5vw,44px)', color: '#fff', margin: 0, lineHeight: 1,
            }}>{overallBand}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '.68rem', letterSpacing: '.12em', color: 'rgba(231,206,142,.4)', marginTop: 4 }}>OVERALL</p>
          </div>

          <button
            onClick={handleShare}
            disabled={sharing === 'loading'}
            style={{
              fontFamily: 'var(--font-body)', fontSize: '.8rem',
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              border: sharing === 'copied' ? '1px solid rgba(74,222,128,.5)' : '1px solid rgba(200,161,75,.3)',
              background: 'transparent',
              color: sharing === 'copied' ? '#4ade80' : 'rgba(200,161,75,.75)',
              transition: 'all .18s',
              whiteSpace: 'nowrap',
            }}
          >
            {shareLabel}
          </button>

          <span style={{ fontFamily: 'var(--font-body)', fontSize: '.75rem', color: 'rgba(231,206,142,.3)' }}>
            Xem chi tiết →
          </span>
        </div>

      </div>
    </div>
  );
}
