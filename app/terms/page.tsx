import Link from 'next/link';

export const metadata = {
  title: 'Điều khoản dịch vụ — WriteRight',
};

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(17,24,58,.97)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(200,161,75,.25)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 18, color: 'var(--champagne)', textDecoration: 'none' }}>
            Write<span style={{ color: 'var(--imperial-gold)' }}>Right</span>
          </Link>
          <Link href="/" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9c8657', textDecoration: 'none' }}>← Trang chủ</Link>
        </div>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 20px 80px' }}>
        <h1 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 28, color: 'var(--ivory)', marginBottom: 8 }}>
          Điều khoản dịch vụ
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#9c8657', marginBottom: 40 }}>
          Cập nhật lần cuối: 30/06/2026
        </p>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#cdbb8e', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 32 }}>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>1. Chấp nhận điều khoản</h2>
            <p>Bằng cách truy cập và sử dụng WriteRight (writeright-w5r9.vercel.app), bạn đồng ý tuân thủ các Điều khoản Dịch vụ này. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>2. Mô tả dịch vụ</h2>
            <p>WriteRight là công cụ chấm bài IELTS Writing tự động sử dụng trí tuệ nhân tạo (AI). Dịch vụ cung cấp:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              <li>Chấm điểm band theo 4 tiêu chí IELTS (Task Achievement, Lexical Resource, Grammatical Range, Coherence & Cohesion).</li>
              <li>Sửa lỗi ngữ pháp và từ vựng chi tiết.</li>
              <li>Tạo mở bài mẫu Band 9 dành riêng cho đề bài.</li>
              <li>Lịch sử chấm bài và theo dõi tiến bộ (với tài khoản đăng nhập).</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>3. Tài khoản và đăng ký</h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Bạn phải đăng nhập bằng tài khoản Google để sử dụng dịch vụ chấm bài.</li>
              <li>Bạn chịu trách nhiệm bảo mật tài khoản của mình.</li>
              <li>Mỗi người dùng chỉ được phép tạo một tài khoản.</li>
              <li>Bạn phải đủ 13 tuổi trở lên để sử dụng dịch vụ.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>4. Gói dịch vụ và thanh toán</h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong style={{ color: 'var(--ivory)' }}>Gói Miễn phí:</strong> 1 lượt chấm bài/tuần, không giới hạn thời gian sử dụng.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>Gói Standard (90.000 VNĐ/tháng):</strong> Chấm bài không giới hạn, xem chi tiết 4 tiêu chí, theo dõi tiến bộ.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>Gói Premium (150.000 VNĐ/tháng):</strong> Tất cả tính năng Standard cộng thêm chụp ảnh bài viết tay, phân tích nâng cao và forecast đề thi.</li>
            </ul>
            <p style={{ marginTop: 12 }}>Thanh toán được xử lý qua PayOS. Gói dịch vụ có hiệu lực ngay sau khi thanh toán thành công và gia hạn hàng tháng. Không hoàn tiền cho chu kỳ đã thanh toán.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>5. Quy tắc sử dụng</h2>
            <p style={{ marginBottom: 10 }}>Bạn đồng ý không sử dụng dịch vụ để:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Nộp bài của người khác mà không có sự cho phép.</li>
              <li>Cố ý vượt giới hạn lượt chấm bài của gói Miễn phí bằng cách tạo nhiều tài khoản.</li>
              <li>Sử dụng các công cụ tự động, bot hay script để gọi API hàng loạt.</li>
              <li>Phân phối lại hoặc bán lại kết quả chấm bài của dịch vụ.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>6. Giới hạn trách nhiệm</h2>
            <p>WriteRight là công cụ hỗ trợ luyện tập — không phải dịch vụ chấm bài chính thức của IDP hay British Council. Điểm band do AI tạo ra mang tính chất tham khảo và có thể sai lệch so với điểm thi thực tế. Chúng tôi không chịu trách nhiệm đối với bất kỳ quyết định học thuật hay thi cử nào dựa trên kết quả của dịch vụ.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>7. Sở hữu trí tuệ</h2>
            <p>Giao diện, logo, thiết kế và code của WriteRight thuộc sở hữu của UNICOACH. Nội dung bài luận bạn nộp vẫn thuộc về bạn. Kết quả chấm bài do AI tạo ra không có bản quyền và bạn được tự do sử dụng cho mục đích học tập cá nhân.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>8. Thay đổi dịch vụ</h2>
            <p>Chúng tôi có quyền thay đổi, tạm ngừng hoặc chấm dứt dịch vụ bất kỳ lúc nào với thông báo hợp lý. Trong trường hợp chấm dứt dịch vụ, gói trả phí còn hiệu lực sẽ được hoàn tiền theo tỷ lệ thời gian còn lại.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>9. Liên hệ</h2>
            <p>Mọi thắc mắc về điều khoản dịch vụ, vui lòng liên hệ:<br />
              <a href="mailto:phanvandiep2014@gmail.com" style={{ color: 'var(--imperial-gold)', textDecoration: 'none' }}>phanvandiep2014@gmail.com</a>
            </p>
          </section>
        </div>
      </main>

      <footer style={{ background: 'var(--royal-sapphire)', padding: '30px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 10 }}>
          <Link href="/privacy" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9c8657', textDecoration: 'none' }}>Chính sách bảo mật</Link>
          <Link href="/terms" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9c8657', textDecoration: 'none' }}>Điều khoản dịch vụ</Link>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#5a4a3a' }}>© 2026 WriteRight · UNICOACH</div>
      </footer>
    </div>
  );
}
