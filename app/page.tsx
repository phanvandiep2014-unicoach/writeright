'use client';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';
import { RoyalIcon } from '@/components/RoyalIcons';
import ProofStats from '@/components/ProofStats';
import ThemeToggle from '@/components/ThemeToggle';
import { withBase } from '@/lib/base-path';

const features = [
  { icon: 'star', title: 'Chấm điểm 4 tiêu chí', desc: 'Task Achievement, Lexical Resource, Grammar, Coherence — chuẩn IELTS.' },
  { icon: 'quill', title: 'Sửa lỗi chi tiết', desc: 'AI phát hiện và giải thích từng lỗi ngữ pháp, từ vựng, collocation.' },
  { icon: 'scroll', title: 'Bài mẫu Band 9', desc: 'Tự động tạo mở bài mẫu Band 9 cho mọi đề bài.' },
  { icon: 'camera', title: 'Chụp ảnh bài viết', desc: 'Chụp ảnh bài viết tay — AI đọc và chấm điểm ngay.' },
  { icon: 'progress', title: 'Theo dõi tiến bộ', desc: 'Dashboard cá nhân, xem lịch sử điểm và sự tiến bộ.' },
  { icon: 'telescope', title: 'Forecast đề thi', desc: 'Cập nhật đề dự đoán Writing mới nhất mỗi tháng.' },
];

function Crest({ size = 40 }: { size?: number }) {
  return <img src={withBase('/crest.png')} alt="" height={Math.round(size * 1.21)} style={{ height: size * 1.21, width: 'auto' }} />;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ThemeToggle />
            <Link href="/courses" className="app-nav-link" style={{ fontSize: 14 }}>Khóa học</Link>
            <Link href="/mock" className="app-nav-link" style={{ fontSize: 14 }}>Thi thử</Link>
            <UserMenu />
            <Link href="/evaluate" className="btn-royal hidden sm:inline-block" style={{ fontSize: 14, padding: '9px 18px' }}>Chấm bài ngay</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        padding: '90px 20px 70px', textAlign: 'center',
        background: 'radial-gradient(ellipse 120% 100% at 50% -20%, rgba(200,161,75,.16), transparent 55%), var(--wr-band)'
      }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
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
          <Link href="/mock" className="btn-ghost" style={{ color: 'var(--champagne)', borderColor: 'rgba(231,206,142,.45)' }}>⏱ Thi thử có tính giờ</Link>
          <Link href="/courses" className="btn-ghost" style={{ color: 'var(--champagne)', borderColor: 'rgba(231,206,142,.45)' }}>📘 Khóa học Writing</Link>
          <a href={withBase("/pricing")} className="btn-ghost" style={{ color: 'var(--champagne)', borderColor: 'rgba(231,206,142,.45)' }}>Xem bảng giá</a>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 52, marginTop: 52, flexWrap: 'wrap' }}>
          {[['4', 'Tiêu chí chấm'], ['9.0', 'Bài mẫu Band'], ['< 15s', 'Thời gian chấm']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 38, lineHeight: 1 }} className="gold-foil">{num}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--imperial-gold)', marginTop: 8 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1060, margin: '0 auto', padding: '70px 20px', background: 'var(--wr-bg)' }}>
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
              <div style={{ marginBottom: 12 }}><RoyalIcon name={f.icon} size={30} /></div>
              <h3 className="heading-vi" style={{ fontSize: 17, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink)', opacity: .8, lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Số liệu thật — tự ẩn khi chưa đủ mẫu, xem components/ProofStats.tsx */}
      <ProofStats />

      {/* Pricing */}
      <section id="pricing" style={{
        maxWidth: 1060, margin: '0 auto', padding: '70px 20px',
        background: 'radial-gradient(ellipse 120% 80% at 50% 120%, rgba(200,161,75,.06), transparent 50%), var(--wr-band)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--imperial-gold)' }}>Bảng giá</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(24px,3.6vw,34px)', color: 'var(--ivory)' }}>Chọn gói phù hợp với bạn</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }}>

          {/* Free */}
          <div style={{ background: '#161E48', border: '1px solid rgba(200,161,75,.18)', borderRadius: 8, padding: '30px 26px' }}>
            <div style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9c8657' }}>Miễn phí</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 32, color: 'var(--ivory)', margin: '12px 0 2px' }}>0 <span style={{ fontSize: 16, color: '#9c8657' }}>VNĐ</span></div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 15, color: '#9c8657', marginBottom: 22 }}>/ tháng</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ 1 bài chấm / tuần</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Xem band tổng ngay lập tức</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Gợi ý chung để cải thiện</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#5a4a3a', textDecoration: 'line-through' }}>✗ Điểm 4 tiêu chí chi tiết</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#5a4a3a', textDecoration: 'line-through' }}>✗ Sửa lỗi inline + vòng viết lại</li>
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
            <div className="gold-foil" style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 32, margin: '12px 0 2px' }}>90.000 <span style={{ fontSize: 16 }}>VNĐ</span></div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 15, color: '#9c8657', marginBottom: 22 }}>/ tháng</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Chấm không giới hạn</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Điểm 4 tiêu chí chi tiết</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Sửa lỗi inline + giải thích</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Vòng viết lại có so sánh điểm</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Biểu đồ tiến bộ theo thời gian</li>
            </ul>
            <Link href="/pricing" className="btn-royal" style={{ display: 'block', textAlign: 'center' }}>Đăng ký ngay</Link>
          </div>

          {/* Premium */}
          <div style={{ background: '#161E48', border: '1px solid rgba(200,161,75,.18)', borderRadius: 8, padding: '30px 26px' }}>
            <div style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9c8657' }}>Premium</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 32, color: 'var(--ivory)', margin: '12px 0 2px' }}>150.000 <span style={{ fontSize: 16, color: '#9c8657' }}>VNĐ</span></div>
            <div style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 15, color: '#9c8657', marginBottom: 22 }}>/ tháng</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Mọi tính năng Standard</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Mẫu bài band 8.0–9.0 theo từng đề</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Ưu tiên chấm nhanh</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Báo cáo gửi giáo viên/lớp</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: '#cdbb8e' }}>✓ Forecast đề thi hàng tháng</li>
            </ul>
            <Link href="/pricing" className="btn-ghost" style={{ display: 'block', textAlign: 'center', color: 'var(--champagne)', borderColor: 'rgba(200,161,75,.3)' }}>Chọn Premium</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '80px 20px', textAlign: 'center', background: 'var(--wr-bg)' }}>
        <div className="foil-rule" style={{ width: 80, margin: '0 auto 24px' }} />
        <h2 className="heading-vi" style={{ fontSize: 'clamp(22px,3.4vw,32px)', marginBottom: 14 }}>Sẵn sàng nâng Band Writing?</h2>
        <p style={{ fontFamily: 'var(--font-subhead)', fontSize: 19, color: 'var(--ink)', opacity: .75, marginBottom: 30 }}>
          Chấm bài theo đúng 4 tiêu chí IELTS — nhận phản hồi chi tiết trong vài giây.
        </p>
        <Link href="/evaluate" className="btn-royal">Chấm bài ngay →</Link>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--wr-band)', padding: '46px 20px', textAlign: 'center' }}>
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
