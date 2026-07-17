import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--royal-sapphire)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
      <img src="/favicon.svg" alt="" width={72} height={72} style={{ marginBottom: 24 }} />
      <div className="gold-foil" style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 64, lineHeight: 1 }}>404</div>
      <h1 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 24, color: 'var(--ivory)', margin: '18px 0 8px' }}>
        Trang này chưa được chép vào thư viện
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'rgba(231,206,142,.75)', maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.6 }}>
        Đường dẫn có thể đã thay đổi, hoặc trang đang được biên soạn. Hãy quay về sảnh chính để tiếp tục hành trình.
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="btn-royal">Về trang chủ</Link>
        <Link href="/evaluate" className="btn-ghost" style={{ color: 'var(--champagne)', borderColor: 'rgba(231,206,142,.45)' }}>Chấm bài ngay</Link>
      </div>
      <p style={{ fontFamily: 'var(--font-subhead)', fontStyle: 'italic', fontSize: 14, color: 'rgba(231,206,142,.5)', marginTop: 36 }}>
        “Per te, ad astra” — through you, to the stars
      </p>
    </div>
  );
}
