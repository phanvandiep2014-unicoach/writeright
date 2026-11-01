'use client';

/**
 * <PricingRoyal> — the brand-kit'd, conversion-tuned pricing block.
 *
 * Conversion choices baked in:
 *   - Standard is the visual anchor ("phổ biến nhất"), framed against Free's limits.
 *   - Each tier headline names the OUTCOME, not the feature.
 *   - A single gold-foil flourish on the recommended tier (Chanel rule: one accessory).
 *   - Annual is a *dated* launch price, not a permanent discount — it fuels the
 *     "khoá giá vĩnh viễn" mechanic and gives early buyers a reason to advocate.
 *   - Từ 02/11/2026 chỉ bán gói hội viên Scholar / Laureate (WriteRight + Precisely + Pass LMS);
 *     gói cũ (Duo, Precisely Speak, WriteRight 90k/150k) ngừng bán, khách cũ giữ đến hết hạn.
 *
 * IMPORTANT — every non-soft `id` (and `secondary.id`) MUST exist in PLANS in
 * app/api/checkout/route.ts. Anything not sellable yet sets `soft: true` → waitlist link.
 */

/** Hạn cuối của giá khai trương gói năm. ĐỔI Ở ĐÂY khi chốt ngày thật. */
const LAUNCH_PRICE_UNTIL = '30/09/2026';

/** Nơi nhận đăng ký danh sách chờ + tư vấn gói năm. Đổi sang form/Messenger thật nếu cần. */
const WAITLIST_URL = 'https://m.me/100094162043326';

type Tier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  outcome: string;
  cta: string;
  featured: boolean;
  soft?: boolean;
  badge?: string;
  note?: string;
  /** Các nút phụ (gói 1 tháng, 12 tháng). `id` phải có trong PLANS ở app/api/checkout/route.ts. */
  secondary?: { id: string; label: string }[];
  features: string[];
  locked: string[];
};

/**
 * Gói hội viên (từ 02/11/2026): WriteRight + Precisely + Pass mọi khóa tự học trên LMS.
 * Giá + mã gói phải khớp PLANS trong app/api/checkout/route.ts.
 * Hạn mức phải khớp lib/membership.ts (15 / 30 bài) và gotcha-web/api/_lib/quota-rules.js (45 / 90 phút).
 * Gói 3 tháng là nút chính vì người ôn IELTS thường ôn 2–3 tháng.
 */
const tiers: Tier[] = [
  {
    id: 'free',
    name: 'Miễn phí',
    price: '0đ',
    cadence: '',
    outcome: 'Thử sức và xem band tổng',
    cta: 'Bắt đầu miễn phí',
    featured: false,
    features: [
      '1 bài chấm Writing / tuần',
      '15 phút chấm phát âm Precisely (tặng một lần)',
      'Unit 1–2 mọi khóa tự học trên LMS',
    ],
    locked: ['Điểm 4 tiêu chí chi tiết', 'Sửa lỗi inline', 'Vòng viết lại', 'Mở toàn bộ khóa tự học'],
  },
  {
    id: 'scholar_quarterly',
    name: 'Scholar',
    price: '499.000đ',
    cadence: '/ 3 tháng',
    outcome: 'Đủ cho một vòng ôn thi: viết, nói và toàn bộ khóa tự học',
    cta: 'Chọn Scholar 3 tháng',
    featured: true,
    badge: 'Mua lẻ 3 sản phẩm khoảng 335.000đ/tháng',
    secondary: [
      { id: 'scholar_monthly', label: '1 tháng · 199.000đ' },
      { id: 'scholar_yearly', label: '12 tháng · 1.590.000đ' },
    ],
    note: 'Khoảng 5.500đ một ngày với gói 3 tháng. Đăng nhập Precisely và LMS bằng đúng email này để gói tự mở.',
    features: [
      'WriteRight: 15 bài chấm Writing mỗi 30 ngày, điểm 4 tiêu chí, sửa lỗi inline, vòng viết lại',
      'Precisely: 45 phút chấm Speaking mỗi tháng (khoảng 3 bài nói đủ 3 Part)',
      'LMS: mở mọi khóa tự học (Reading, Listening, Pronunciation, Shadowing, Từ vựng, Dịch, Writing, Speaking)',
      'Biểu đồ tiến bộ, chia sẻ link kết quả cho thầy cô, bố mẹ',
    ],
    locked: [],
  },
  {
    id: 'laureate_quarterly',
    name: 'Laureate',
    price: '749.000đ',
    cadence: '/ 3 tháng',
    outcome: 'Cường độ cao: gấp đôi lượt chấm cho giai đoạn nước rút',
    cta: 'Chọn Laureate 3 tháng',
    featured: false,
    secondary: [
      { id: 'laureate_monthly', label: '1 tháng · 299.000đ' },
      { id: 'laureate_yearly', label: '12 tháng · 2.390.000đ' },
    ],
    features: [
      'Mọi quyền lợi Scholar',
      'WriteRight: 30 bài chấm Writing mỗi 30 ngày',
      'Chấm ảnh bài viết tay (chụp bài viết trên giấy)',
      'Precisely: 90 phút chấm Speaking mỗi tháng',
      'Các khóa học riêng trong WriteRight',
    ],
    locked: [],
  },
];

function TierCard({ t, onChoose }: { t: Tier; onChoose: (id: string) => void }) {
  const handle = () => {
    if (t.soft) {
      window.open(WAITLIST_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    onChoose(t.id);
  };

  return (
    <div
      style={{
        position: 'relative', textAlign: 'left',
        background: t.featured ? 'var(--royal-sapphire)' : 'var(--surface)',
        color: t.featured ? 'var(--champagne)' : 'var(--sepia-ink)',
        border: t.featured ? '1.5px solid transparent' : 'var(--hairline)',
        borderRadius: 16, padding: '28px 24px',
        boxShadow: t.featured ? 'var(--shadow-card)' : 'none',
        opacity: t.soft ? 0.94 : 1,
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
            {t.soft ? 'Đáng chờ nhất' : 'Phổ biến nhất'}
          </span>
        </>
      )}

      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: '1.4rem', margin: 0 }}>
        {t.name}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '.95rem', opacity: .85, margin: '4px 0 16px' }}>
        {t.outcome}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: t.badge ? 8 : 20 }}>
        <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: '2rem' }}>{t.price}</span>
        <span style={{ fontFamily: 'var(--font-body)', opacity: .75 }}>{t.cadence}</span>
      </div>

      {t.badge && (
        <div
          style={{
            display: 'inline-block', marginBottom: 12,
            fontFamily: 'var(--font-body)', fontSize: '.78rem', letterSpacing: '.02em',
            border: t.featured ? '1px solid var(--champagne)' : 'var(--hairline)',
            color: t.featured ? 'var(--champagne)' : 'var(--royal-oxblood)',
            borderRadius: 99, padding: '3px 10px',
          }}
        >
          {t.badge}
        </div>
      )}

      <button
        className={t.featured ? 'btn-royal' : 'btn-ghost'}
        style={{ width: '100%', marginBottom: t.secondary ? 8 : t.note ? 10 : 20 }}
        onClick={handle}
      >
        {t.cta}
      </button>

      {t.secondary?.map((s, i) => (
        <button
          key={s.id}
          className="btn-ghost"
          style={{ width: '100%', marginBottom: i === t.secondary!.length - 1 ? (t.note ? 10 : 20) : 8 }}
          onClick={() => onChoose(s.id)}
        >
          {s.label}
        </button>
      ))}

      {t.note && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.78rem', opacity: .7, margin: '0 0 16px', lineHeight: 1.5 }}>
          {t.note}
        </p>
      )}

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
  );
}

export function PricingRoyal({ onChoose }: { onChoose: (tierId: string) => void }) {
  const grid: React.CSSProperties = {
    display: 'grid', gap: 20, alignItems: 'stretch',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  };

  return (
    <section style={{ background: 'var(--bg)', padding: '64px 20px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <span className="eyebrow">Per te, ad astra</span>
        <h2 className="heading-vi" style={{ fontSize: '2.2rem', margin: '8px 0 6px' }}>
          Chọn lộ trình lên <span className="foil-ink">band mục tiêu</span>
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', maxWidth: 560, margin: '0 auto 40px' }}>
          Bản miễn phí cho bạn thấy điểm. Bản nâng cấp cho bạn cách nâng điểm — chi tiết từng tiêu chí,
          từng lỗi, từng lần viết lại.
        </p>

        <div style={grid}>
          {tiers.map((t) => (
            <TierCard key={t.id} t={t} onChoose={onChoose} />
          ))}
        </div>

        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', maxWidth: 620, margin: '28px auto 0', fontSize: '.92rem' }}>
          Mỗi gói hội viên dùng chung cho WriteRight, Precisely và các khóa tự học trên LMS. Thanh toán một lần qua PayOS,
          không tự động trừ tiền. Bạn đang dùng gói cũ (Scholar/Laureate 90k–150k, Duo, Precisely Speak, Pass) thì giữ nguyên đến hết hạn.
        </p>

        {/* ── Nói thẳng ──────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 64, textAlign: 'left', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto',
            border: 'var(--hairline)', borderRadius: 16, padding: '24px 26px', background: 'var(--surface)',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: '1.15rem', margin: '0 0 14px' }}>
            Ba điều chúng tôi nói trước khi bạn trả tiền
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {[
              ['Band là ước lượng tham khảo.', 'Điểm do WriteRight đưa ra dựa trên band descriptor công khai của IELTS và được hiệu chỉnh để ổn định giữa các lần chấm — nhưng nó không phải điểm thi chính thức và có thể lệch so với điểm thi thật.'],
              ['Không tự động trừ tiền.', 'Hết tháng là dừng. Muốn dùng tiếp thì bạn chủ động gia hạn. Chúng tôi không kiếm tiền từ việc bạn quên huỷ.'],
              ['Mỗi gói có hạn mức chấm rõ ràng.', 'Mỗi bài chấm đều tốn chi phí AI thật, nên Scholar có 15 bài Writing + 45 phút nói, Laureate có 30 bài + 90 phút. Lượt Writing tính theo 30 ngày gần nhất, phút nói tính theo tháng.'],
            ].map(([title, body]) => (
              <li key={title} style={{ fontFamily: 'var(--font-body)', fontSize: '.92rem', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--royal-oxblood)', marginRight: 8 }}>✦</span>
                <strong>{title}</strong>{' '}
                <span style={{ opacity: .8 }}>{body}</span>
              </li>
            ))}
          </ul>
        </div>

        <p style={{ fontFamily: 'var(--font-body)', fontSize: '.82rem', opacity: .65, marginTop: 24 }}>
          Cần tư vấn gói đôi hoặc gói cho lớp học?{' '}
          <a href={WAITLIST_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
            Nhắn cho chúng tôi
          </a>.
        </p>
      </div>
    </section>
  );
}
