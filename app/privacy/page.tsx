import Link from 'next/link';

export const metadata = {
  title: 'Chính sách bảo mật — WriteRight',
};

export default function PrivacyPage() {
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
          Chính sách bảo mật
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#9c8657', marginBottom: 40 }}>
          Cập nhật lần cuối: 30/06/2026
        </p>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#cdbb8e', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 32 }}>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>1. Thông tin chúng tôi thu thập</h2>
            <p style={{ marginBottom: 10 }}>Khi bạn sử dụng WriteRight, chúng tôi thu thập các thông tin sau:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong style={{ color: 'var(--ivory)' }}>Thông tin tài khoản:</strong> Tên, địa chỉ email và ảnh đại diện từ tài khoản Google của bạn khi bạn đăng nhập bằng Google OAuth.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>Nội dung bài luận:</strong> Bài viết IELTS và ảnh bài viết tay bạn nộp để chấm điểm. Nội dung này được gửi đến Claude AI (Anthropic) để xử lý và không được lưu lại sau khi trả kết quả.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>Kết quả chấm bài:</strong> Điểm band, nhận xét và lịch sử chấm bài được lưu trong cơ sở dữ liệu Supabase để hiển thị trong Dashboard của bạn.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>Dữ liệu sử dụng:</strong> Số lượt chấm bài trong tuần để kiểm soát giới hạn gói Miễn phí.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>2. Cách chúng tôi sử dụng thông tin</h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Cung cấp dịch vụ chấm bài IELTS Writing tự động.</li>
              <li>Hiển thị lịch sử chấm bài và tiến bộ trong Dashboard cá nhân.</li>
              <li>Xác minh tư cách thành viên và quản lý giới hạn lượt chấm theo gói.</li>
              <li>Xử lý thanh toán và kích hoạt gói Standard / Premium.</li>
            </ul>
            <p style={{ marginTop: 12 }}>Chúng tôi <strong style={{ color: 'var(--ivory)' }}>không</strong> bán thông tin của bạn cho bên thứ ba. Chúng tôi <strong style={{ color: 'var(--ivory)' }}>không</strong> sử dụng bài luận của bạn để huấn luyện AI.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>3. Bên thứ ba</h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong style={{ color: 'var(--ivory)' }}>Google OAuth:</strong> Xác thực danh tính. Chúng tôi chỉ nhận email, tên và ảnh đại diện — không nhận quyền truy cập vào tài khoản Google khác của bạn.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>Anthropic Claude API:</strong> Xử lý và chấm bài luận. Nội dung bài được gửi qua API bảo mật và không được Anthropic lưu trữ lâu dài theo điều khoản sử dụng API của họ.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>Supabase:</strong> Lưu trữ dữ liệu tài khoản và lịch sử chấm bài trên máy chủ bảo mật.</li>
              <li><strong style={{ color: 'var(--ivory)' }}>PayOS:</strong> Xử lý thanh toán. Thông tin thẻ không đi qua máy chủ của chúng tôi.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>4. Bảo mật dữ liệu</h2>
            <p>Dữ liệu của bạn được bảo vệ bằng mã hóa HTTPS trong quá trình truyền tải. Truy cập vào cơ sở dữ liệu được kiểm soát bằng chính sách Row-Level Security (RLS) của Supabase — mỗi người dùng chỉ thấy dữ liệu của chính mình.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>5. Quyền của bạn</h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan.</li>
              <li>Xuất lịch sử chấm bài của bạn (tính năng đang phát triển).</li>
              <li>Rút lại sự đồng ý bằng cách xóa tài khoản.</li>
            </ul>
            <p style={{ marginTop: 12 }}>Để thực hiện các quyền trên, liên hệ: <a href="mailto:phanvandiep2014@gmail.com" style={{ color: 'var(--imperial-gold)', textDecoration: 'none' }}>phanvandiep2014@gmail.com</a></p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>6. Cookie</h2>
            <p>Chúng tôi sử dụng cookie phiên làm việc (session cookie) cần thiết cho đăng nhập và xác thực. Chúng tôi không sử dụng cookie theo dõi hay quảng cáo.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-subhead)', fontWeight: 600, fontSize: 18, color: 'var(--ivory)', marginBottom: 12 }}>7. Liên hệ</h2>
            <p>Mọi câu hỏi về chính sách bảo mật, vui lòng liên hệ:<br />
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
