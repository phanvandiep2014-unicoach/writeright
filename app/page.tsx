'use client';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';

const features = [
  { icon: '✦', title: 'Chấm điểm 4 tiêu chí', desc: 'Task Achievement, Lexical Resource, Grammar, Coherence — chuẩn IELTS.' },
  { icon: '✏', title: 'Sửa lỗi chi tiết', desc: 'AI phát hiện và giải thích từng lỗi ngữ pháp, từ vựng, collocation.' },
  { icon: '📝', title: 'Bài mẫu Band 9', desc: 'Tự động tạo mở bài mẫu Band 9 cho mọi đề bài.' },
  { icon: '📷', title: 'Chụp ảnh bài viết', desc: 'Chụp ảnh bài viết tay — AI đọc và chấm điểm ngay.' },
  { icon: '📊', title: 'Theo dõi tiến bộ', desc: 'Dashboard cá nhân, xem lịch sử điểm và sự tiến bộ.' },
  { icon: '🔮', title: 'Forecast đề thi', desc: 'Cập nhật đề dự đoán Writing mới nhất mỗi tháng.' },
];

function Crest({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.21} viewBox="330 70 420 480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crestGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6A28" /><stop offset=".28" stopColor="#E7CE8E" />
          <stop offset=".52" stopColor="#C8A14B" /><stop offset=".74" stopColor="#F4E7BC" />
          <stop offset="1" stopColor="#9A7A2E" />
        </linearGradient>
        <linearGradient id="crestField" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2552" /><stop offset="1" stopColor="#0B1029" />
        </linearGradient>
      </defs>
      <path d="M462 182 L494 132 L520 160 L540 112 L560 160 L586 132 L618 182 Z" fill="url(#crestGold)" />
      <circle cx="494" cy="129" r="6.5" fill="url(#crestGold)" />
      <circle cx="586" cy="129" r="6.5" fill="url(#crestGold)" />
      <circle cx="540" cy="108" r="7" fill="url(#crestGold)" />
      <path d="M540 92 v16 M531 100 h18" stroke="url(#crestGold)" strokeWidth="4.5" strokeLinecap="round" />
      <rect x="460" y="182" width="160" height="17" rx="4" fill="url(#crestField)" stroke="url(#crestGold)" strokeWidth="4" />
      <circle cx="500" cy="190.5" r="3.4" fill="url(#crestGold)" />
      <circle cx="540" cy="190.5" r="3.4" fill="url(#crestGold)" />
      <circle cx="580" cy="190.5" r="3.4" fill="url(#crestGold)" />
      <g fill="url(#crestGold)">
        <path d="M420 488 C372 446 360 360 388 256" stroke="url(#crestGold)" strokeWidth="5" fill="none" />
        <ellipse cx="378" cy="300" rx="18" ry="8" transform="rotate(40 378 300)" />
        <ellipse cx="372" cy="348" rx="18" ry="8" transform="rotate(28 372 348)" />
        <ellipse cx="376" cy="396" rx="18" ry="8" transform="rotate(14 376 396)" />
        <ellipse cx="392" cy="440" rx="18" ry="8" transform="rotate(-2 392 440)" />
        <path d="M660 488 C708 446 720 360 692 256" stroke="url(#crestGold)" strokeWidth="5" fill="none" />
        <ellipse cx="702" cy="300" rx="18" ry="8" transform="rotate(-40 702 300)" />
        <ellipse cx="708" cy="348" rx="18" ry="8" transform="rotate(-28 708 348)" />
        <ellipse cx="704" cy="396" rx="18" ry="8" transform="rotate(-14 704 396)" />
        <ellipse cx="688" cy="440" rx="18" ry="8" transform="rotate(2 688 440)" />
      </g>
      <path d="M432 214 L648 214 L648 330 C648 416 596 466 540 496 C484 466 432 416 432 330 Z" fill="url(#crestField)" stroke="url(#crestGold)" strokeWidth="6.5" />
      <path d="M448 230 L632 230 L632 330 C632 405 586 451 540 474 C494 451 448 405 448 330 Z" fill="none" stroke="url(#crestGold)" strokeWidth="1.6" />
      <g fill="url(#crestGold)">
        <path d="M484 250 l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" />
        <path d="M540 246 l5.5 12 13 1-10 8.5 3.2 13-11.7-6.4-11.7 6.4 3.2-13-10-8.5 13-1z" />
        <path d="M596 250 l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" />
      </g>
      <g stroke="url(#crestGold)" strokeWidth="3.4" strokeLinecap="round">
        <path d="M540 318 v-16" /><path d="M508 326 l-10-12" /><path d="M572 326 l10-12" />
        <path d="M486 344 l-13-6" /><path d="M594 344 l13-6" />
      </g>
      <g stroke="url(#crestGold)" strokeWidth="4" fill="#0B1029" strokeLinejoin="round">
        <path d="M540 352 C508 340 476 343 458 352 L458 422 C476 412 508 410 540 422 Z" />
        <path d="M540 352 C572 340 604 343 622 352 L622 422 C604 412 572 410 540 422 Z" />
        <path d="M540 352 V422" fill="none" />
        <g strokeWidth="2.2">
          <path d="M472 372 q24-7 56 1" /><path d="M472 388 q24-7 56 1" />          <path d="M552 373 q24-7 56 1" /><path d="M552 389 q24-7 56 1" />
        </g>
      </g>
      <path d="M368 486 L400 478 L400 524 L368 532 L382 509 Z" fill="#3A0E18" stroke="url(#crestGold)" strokeWidth="3" />
      <path d="M712 486 L680 478 L680 524 L712 532 L698 509 Z" fill="#3A0E18" stroke="url(#crestGold)" strokeWidth="3" />
      <path d="M396 478 L684 478 L684 524 L540 534 L396 524 Z" fill="#5A1726" stroke="url(#crestGold)" strokeWidth="3.5" />
      <text x="540" y="511" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="700" fontSize="24" letterSpacing="1.5" fill="url(#crestGold)">PER TE · AD ASTRA</text>
    </svg>
  );
}

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(17,24,58,.97)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(200,161,75,.25)'
      }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crest size={32} />
            <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 19, letterSpacing: '.03em', color: 'var(--champagne)' }}>
              Write<span className="gold-foil">Right</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <UserMenu />
            <Link href="/evaluate" className="btn-royal" style={{ fontSize: 14, padding: '9px 18px' }}>Chấm bài ngay</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        maxWidth: 880, margin: '0 auto', padding: '90px 20px 70px', textAlign: 'center',
        background: 'radial-gradient(ellipse 120% 100% at 50% -20%, rgba(200,161,75,.10), transparent 55%)'
      }}>
        <div className="eyebrow" style={{
          display: 'inline-flex', border: '1px solid rgba(200,161,75,.35)', borderRadius: 2,
          padding: '9px 22px', marginBottom: 28, color: 'var(--champagne)'
        }}>
          AI-Powered · Free · Task 1 &amp; 2
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <Crest size={88} />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-subhead)', fontWeight: 700,
          fontSize: 'clamp(32px,5.5vw,50px)', lineHeight: 1.25, color: 'var(--ivory)', margin: 0
        }}>
          Tự luyện IELTS Writing<br />
          <em style={{ fontStyle: 'normal' }} className="gold-foil">hiệu quả mỗi ngày</em>
        </h1>

        <p style={{ fontFamily: 'var(--font-subhead)', fontSize: 20, color: '#cdbb8e', maxWidth: 560, margin: '22px auto 0', lineHeight: 1.55 }}>
          Dán bài luận hoặc chụp ảnh bài viết tay. Nhận điểm band, sửa lỗi chi tiết và bài mẫu Band 9 trong vài giây.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 36, flexWrap: 'wrap' }}>
          <Link href="/evaluate" className="btn-royal">✦ Chấm bài miễn phí</Link>
          <a href="/pricing" className="btn-ghost">Xem bảng giá</a>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 52, marginTop: 52, flexWrap: 'wrap' }}>
          {[['4', 'Tiêu chí chấm'], ['9.0', 'Bài mẫu Band'], ['< 15s', 'Thời gian chấm']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 36, lineHeight: 1 }} className="gold-foil">{num}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--imperial-gold)', marginTop: 8 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1060, margin: '0 auto', padding: '70px 20px', background: 'var(--parchment)' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Tính năng</div>
          <h2 className="heading-vi" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>Mọi thứ bạn cần để nâng Band Writing</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: 'var(--surface)', border: 'var(--hairline)', borderRadius: 'var(--radius)',
              padding: '26px 22px', boxShadow: 'var(--shadow-card)'
            }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
              <h3 className="heading-vi" style={{ fontSize: 17, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink)', opacity: .8, lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{
        maxWidth: 1060, margin: '0 auto', padding: '70px 20px',
        background: 'radial-gradient(ellipse 120% 80% at 50% 120%, rgba(200,161,75,.06), transparent 50%), var(--royal-sapphire)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--imperial-gold)' }}>Bảng giá</div>
          <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 'clamp(24px,3.6vw,34px)', color: 'var(--ivory)' }}>Chọn gói phù hợp với bạn</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }}>

          {/* Free */}
          <div style={{ background: '#161E48', border: '1px solid rgba(200,161,75,.18)', borderRadius: 8, padding: '30px 26px' }}>
            <div style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9c8657' }}>Miễn phí</div>
            <div style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 30, color: 'var(--ivory)', margin: '12px 0 2px' }}>0 <span style={{ fontSize: 16, color: '#9c8657' }}>VNĐ</span></div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 15, color: '#9c8657', marginBottom: 22 }}>/ tháng</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ 1 lần chấm / tuần</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Sửa lỗi cơ bản</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Bài mẫu mở bài Band 9</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#5a4a3a', textDecoration: 'line-through' }}>✗ Chấm chi tiết 4 tiêu chí</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#5a4a3a', textDecoration: 'line-through' }}>✗ Chụp ảnh bài viết</li>
            </ul>
            <Link href="/evaluate" className="btn-ghost" style={{ display: 'block', textAlign: 'center', color: 'var(--champagne)', borderColor: 'rgba(200,161,75,.3)' }}>Bắt đầu miễn phí</Link>
          </div>

          {/* Standard — highlighted */}
          <div style={{ background: 'linear-gradient(170deg,#1A234E,#0A0E24)', border: '1px solid var(--imperial-gold)', borderRadius: 8, padding: '30px 26px', position: 'relative' }}>            <div style={{
              position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase',
              background: 'var(--royal-oxblood)', color: 'var(--champagne)', padding: '6px 18px', borderRadius: 3, border: '1px solid #8A6A28', whiteSpace: 'nowrap'
            }}>Phổ biến</div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--imperial-gold)' }}>Standard</div>
            <div className="gold-foil" style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 30, margin: '12px 0 2px' }}>90.000 <span style={{ fontSize: 16 }}>VNĐ</span></div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 15, color: '#9c8657', marginBottom: 22 }}>/ tháng</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Chấm điểm không giới hạn</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Chấm chi tiết 4 tiêu chí</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Sửa lỗi + giải thích</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Bài mẫu Band 9</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Theo dõi tiến bộ</li>
            </ul>
            <Link href="/pricing" className="btn-royal" style={{ display: 'block', textAlign: 'center' }}>Đăng ký ngay</Link>
          </div>

          {/* Premium */}
          <div style={{ background: '#161E48', border: '1px solid rgba(200,161,75,.18)', borderRadius: 8, padding: '30px 26px' }}>
            <div style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9c8657' }}>Premium</div>
            <div style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 30, color: 'var(--ivory)', margin: '12px 0 2px' }}>150.000 <span style={{ fontSize: 16, color: '#9c8657' }}>VNĐ</span></div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 15, color: '#9c8657', marginBottom: 22 }}>/ tháng</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Mọi tính năng Standard</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Chụp ảnh bài viết tay</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Phân tích từ vựng nâng cao</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ So sánh side-by-side</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Forecast đề thi hàng tháng</li>
            </ul>
            <Link href="/pricing" className="btn-ghost" style={{ display: 'block', textAlign: 'center', color: 'var(--champagne)', borderColor: 'rgba(200,161,75,.3)' }}>Chọn Premium</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '80px 20px', textAlign: 'center', background: 'var(--parchment)' }}>
        <div className="gold-rule" style={{ width: 80, margin: '0 auto 24px' }} />
        <h2 className="heading-vi" style={{ fontSize: 'clamp(22px,3.4vw,32px)', marginBottom: 14 }}>Sẵn sàng nâng Band Writing?</h2>
        <p style={{ fontFamily: 'var(--font-subhead)', fontSize: 19, color: 'var(--ink)', opacity: .75, marginBottom: 30 }}>
          Chấm bài theo đúng 4 tiêu chí IELTS — nhận phản hồi chi tiết trong vài giây.
        </p>
        <Link href="/evaluate" className="btn-royal">Chấm bài ngay →</Link>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--royal-sapphire)', padding: '46px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <Crest size={26} />
          <span style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 16, color: 'var(--champagne)' }}>UNICOACH</span>
        </div>
        <div style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 15, color: '#9c8657', marginBottom: 18 }}>
          &ldquo;Per te, ad astra&rdquo; — through you, to the stars
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 14 }}>
          <Link href="/privacy" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9c8657', textDecoration: 'none' }}>Chính sách bảo mật</Link>
          <Link href="/terms" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9c8657', textDecoration: 'none' }}>Điều khoản dịch vụ</Link>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#5a4a3a' }}>
          © 2026 WriteRight · UNICOACH — Powered by Claude AI
        </div>
      </footer>
    </div>
  );
}
