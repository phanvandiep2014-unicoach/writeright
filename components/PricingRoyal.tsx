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
 *   - Precisely / Duo ship as a waitlist, not a buy button: the speaking product is
 *     still in beta and per-minute cost makes an un-metered sale unsafe.
 *
 * IMPORTANT — checkout only knows `standard` and `premium` (see app/api/checkout/route.ts).
 * Any tier whose `id` is not one of those MUST set `soft: true` so it routes to the
 * waitlist link instead of PayOS.
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
  features: string[];
  locked: string[];
};

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
    note: 'Khoảng 3.000đ một ngày.',
    features: [
      'Chấm bài viết không giới hạn',
      'Điểm 4 tiêu chí chi tiết',
      'Sửa lỗi inline + giải thích song ngữ',
      'Vòng viết lại có so sánh điểm',
      'Biểu đồ tiến bộ theo thời gian',
      'Chia sẻ link kết quả cho thầy cô, bố mẹ',
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
    badge: 'Trả năm 790.000đ',
    note: `Giá khai trương gói năm, áp dụng đến ${LAUNCH_PRICE_UNTIL}. Đăng ký trong thời gian này được giữ nguyên mức giá cho các lần gia hạn sau.`,
    features: [
      'Mọi tính năng Standard',
      'Mẫu bài band 8.0–9.0 theo từng đề',
      'Ưu tiên chấm nhanh',
      'Báo cáo gửi giáo viên / lớp',
    ],
    locked: [],
  },
];

/** Sắp ra mắt — chưa bán, chỉ nhận danh sách chờ. */
const upcoming: Tier[] = [
  {
    id: 'precisely',
    name: 'Precisely',
    price: '129.000đ',
    cadence: '/ tháng',
    outcome: 'Chấm nói — nghe từng âm tiết, không đoán từ bản chữ',
    cta: 'Nhận thông báo khi mở',
    featured: false,
    soft: true,
    badge: 'Thử nghiệm',
    features: [
      '60 phút nói mỗi tháng ≈ 12 buổi thi thử đầy đủ',
      'Chấm phát âm tới từng âm tiết',
      'Đủ 4 tiêu chí Speaking',
      'Hai chế độ: mô phỏng phòng thi & trò chuyện không chấm điểm',
      'Shadowing và luyện đọc — không giới hạn',
    ],
    locked: [],
  },
  {
    id: 'duo',
    name: 'UNICOACH Duo',
    price: '169.000đ',
    cadence: '/ tháng',
    outcome: 'Viết và nói trong cùng một tài khoản',
    cta: 'Nhận thông báo khi mở',
    featured: true,
    soft: true,
    badge: 'Mua riêng là 219.000đ',
    note: 'Một hồ sơ, một biểu đồ tiến bộ chung cho cả bốn kỹ năng đang luyện.',
    features: [
      'Toàn bộ WriteRight Standard',
      'Toàn bộ Precisely — 60 phút nói mỗi tháng',
      'Band tổng hợp cả viết lẫn nói',
      'Chia sẻ một link duy nhất cho thầy cô hoặc phụ huynh',
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
        style={{ width: '100%', marginBottom: t.note ? 10 : 20 }}
        onClick={handle}
      >
        {t.cta}
      </button>

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
          Chọn lộ trình lên <span className="gold-foil">band mục tiêu</span>
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

        {/* ── Sắp ra mắt ─────────────────────────────────────────────── */}
        <div style={{ marginTop: 72 }}>
          <span className="eyebrow">Sắp ra mắt</span>
          <h2 className="heading-vi" style={{ fontSize: '1.8rem', margin: '8px 0 6px' }}>
            Còn <span className="gold-foil">phần nói</span> thì sao?
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', maxWidth: 620, margin: '0 auto 36px' }}>
            Precisely đang trong giai đoạn thử nghiệm và mở giới hạn. Chúng tôi không bán thứ chưa sẵn sàng —
            nhưng nếu bạn muốn là người vào trước, để lại tin nhắn và chúng tôi sẽ báo ngay khi mở.
          </p>

          <div style={{ ...grid, maxWidth: 720, margin: '0 auto' }}>
            {upcoming.map((t) => (
              <TierCard key={t.id} t={t} onChoose={onChoose} />
            ))}
          </div>
        </div>

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
              ['Chấm bài viết không giới hạn. Phút nói thì có hạn mức.', 'Chấm một bài viết và chấm một phút nói có chi phí rất khác nhau, nên chúng tôi đặt hạn mức ở phần nói thay vì tăng giá cả gói. Hạn mức luôn hiển thị rõ trong tài khoản.'],
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
          Cần tư vấn gói năm, gói đôi hoặc gói cho lớp học?{' '}
          <a href={WAITLIST_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
            Nhắn cho chúng tôi
          </a>.
        </p>
      </div>
    </section>
  );
}
