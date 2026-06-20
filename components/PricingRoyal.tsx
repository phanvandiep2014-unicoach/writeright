'use client';

/**
 * <PricingRoyal> — the brand-kit'd, conversion-tuned pricing block.
 *
 * Conversion choices baked in:
 *   - Standard is the visual anchor ("phổ biến nhất"), framed against Free's limits.
 *   - Each tier headline names the OUTCOME, not the feature.
 *   - A single gold-foil flourish on the recommended tier (Chanel rule: one accessory).
 *   - Annual framing reduces the monthly number's sting without hiding it.
 */
const tiers = [
  {
    id: 'free',
    name: 'Miễn phí',
    price: '0đ',
    cadence: '',
    outcome: 'Thử sức và xem band tổng',
    cta: 'Bắt đầu miễn phí',
    featured: false,
    features: [
      '1 bài chấm / tuần',
      'Xem band tổng ngay lập tức',
      'Gợi ý chung để cải thiện',
    ],
    locked: ['Điểm 4 tiêu chí chi tiết', 'Sửa lỗi inline', 'Vòng viết lại', 'Biểu đồ tiến bộ'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '90.000đ',
    cadence: '/ tháng',
    outcome: 'Biết tại sao và sửa thế nào để lên band',
    cta: 'Nâng cấp Standard',
    featured: true,
    features: [
      'Chấm không giới hạn',
      'Điểm 4 tiêu chí chi tiết',
      'Sửa lỗi inline + giải thích',
      'Vòng viết lại có so sánh điểm',
      'Biểu đồ tiến bộ theo thời gian',
    ],
    locked: [],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '150.000đ',
    cadence: '/ tháng',
    outcome: 'Luyện như có gia sư UNICOACH kèm riêng',
    cta: 'Chọn Premium',
    featured: false,
    features: [
      'Mọi tính năng Standard',
      'Mẫu bài band 8.0–9.0 theo từng đề',
      'Ưu tiên chấm nhanh',
      'Báo cáo gửi giáo viên/lớp',
    ],
    locked: [],
  },
];

export function PricingRoyal({ onChoose }: { onChoose: (tierId: string) => void }) {
  return (
    <section style={{ background: 'var(--bg)', padding: '64px 20px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <span className="eyebrow">Per te, ad astra</span>
        <h2 className="heading-vi" style={{ fontSize: '2.2rem', margin: '8px 0 6px' }}>
          Chọn lộ trình lên <span className="gold-foil">band mục tiêu</span>
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', maxWidth: 560, margin: '0 auto 40px' }}>
          Bản miễn phí cho bạn thấy điểm. Bản nâng cấp cho bạn cách nâng điểm — chi tiết từng tiêu chí, từng lỗi, từng lần viết lại.
        </p>

        <div
          style={{
            display: 'grid', gap: 20, alignItems: 'stretch',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {tiers.map((t) => (
            <div
              key={t.id}
              style={{
                position: 'relative', textAlign: 'left',
                background: t.featured ? 'var(--royal-sapphire)' : 'var(--surface)',
                color: t.featured ? 'var(--champagne)' : 'var(--sepia-ink)',
                border: t.featured ? '1.5px solid transparent' : 'var(--hairline)',
                borderRadius: 16, padding: '28px 24px',
                boxShadow: t.featured ? 'var(--shadow-card)' : 'none',
              }}
            >
              {t.featured && (
                <>
                  {/* gold-foil border for the anchor tier */}
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 16, padding: 1.5,
                      background: 'var(--gold-foil)',
                      WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                      WebkitMaskComposite: 'xor', maskComposite: 'exclude', pointerEvents: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute', top: -12, left: 24,
                      fontFamily: 'var(--font-display)', fontSize: '.7rem', letterSpacing: '.18em',
                      textTransform: 'uppercase', color: 'var(--royal-sapphire)',
                      background: 'var(--gold-foil)', padding: '4px 12px', borderRadius: 99,
                    }}
                  >
                    Phổ biến nhất
                  </span>
                </>
              )}

              <h3 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: '1.4rem', margin: 0 }}>
                {t.name}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '.95rem', opacity: .85, margin: '4px 0 16px' }}>
                {t.outcome}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: '2rem' }}>{t.price}</span>
                <span style={{ fontFamily: 'var(--font-body)', opacity: .75 }}>{t.cadence}</span>
              </div>

              <button
                className={t.featured ? 'btn-royal' : 'btn-ghost'}
                style={{ width: '100%', marginBottom: 20 }}
                onClick={() => onChoose(t.id)}
              >
                {t.cta}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ fontFamily: 'var(--font-body)', display: 'flex', gap: 8 }}>
                    <span style={{ color: t.featured ? 'var(--champagne)' : 'var(--royal-oxblood)' }}>✦</span>
                    {f}
                  </li>
                ))}
                {t.locked.map((f) => (
                  <li key={f} style={{ fontFamily: 'var(--font-body)', display: 'flex', gap: 8, opacity: .45 }}>
                    <span>✕</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
