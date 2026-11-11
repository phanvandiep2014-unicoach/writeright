import Link from 'next/link';
import CentersLeadForm from '@/components/CentersLeadForm';

export const metadata = {
  title: 'WriteRight cho trung tâm & giáo viên — UNICOACH',
  description: 'Chấm IELTS Writing theo tiêu chí band descriptors công khai, kèm nhận xét chi tiết, dashboard lớp và tích hợp LMS. Đang nhận đăng ký đối tác thí điểm.',
};

const h2: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 22, color: 'var(--ivory)', marginBottom: 14 };
const p: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 16, color: '#cdbb8e', lineHeight: 1.8 };
const card: React.CSSProperties = { padding: 18, borderRadius: 12, border: '1px solid rgba(200,161,75,.25)', background: 'rgba(255,255,255,.03)' };

const audiences = [
  ['Trung tâm ngoại ngữ', 'Giảm tải chấm Writing cho giáo viên, học viên nhận phản hồi trong vài phút thay vì vài ngày.'],
  ['Giáo viên, gia sư', 'Chấm nhanh bài của học viên, giữ thời gian cho phần chữa bài và coaching 1-1.'],
  ['Trường và tổ chức giáo dục', 'Theo dõi tiến bộ Writing theo lớp, theo tiêu chí, theo thời gian.'],
  ['Đơn vị có LMS riêng', 'Tích hợp chấm bài vào hệ thống của bạn qua API và webhook.'],
];

const features = [
  'Chấm IELTS Writing Task 1 và Task 2 theo bốn tiêu chí: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy',
  'Nhận xét chi tiết từng tiêu chí, kèm dẫn chứng trích từ bài viết của học viên',
  'Dashboard theo lớp và theo học viên: điểm, lỗi lặp lại, tiến bộ theo thời gian',
  'Chấm hàng loạt chạy nền: dán nhiều bài cùng lúc, nhận kết quả sau',
  'Tích hợp qua API, đăng nhập một lần (SSO) và webhook cho hệ thống LMS của bạn',
];

const steps = [
  ['Gửi thông tin', 'Để lại thông tin đơn vị và nhu cầu ở form bên dưới.'],
  ['Trao đổi và thử nghiệm', 'UNICOACH liên hệ lại, cùng bạn xác định cách dùng phù hợp và chạy thử với bài thật của học viên.'],
  ['Triển khai', 'Mở không gian làm việc cho đơn vị của bạn và hướng dẫn giáo viên sử dụng.'],
];

export default function CentersPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,58,.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(200,161,75,.25)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-wordmark)', fontWeight: 900, fontSize: 18, color: 'var(--champagne)', textDecoration: 'none' }}>
            Write<span style={{ color: 'var(--imperial-gold)' }}>Right</span>
          </Link>
          <a href="#lien-he" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--imperial-gold)', textDecoration: 'none' }}>Liên hệ →</a>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 20px 80px', display: 'flex', flexDirection: 'column', gap: 48 }}>
        <section>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#9c8657', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Dành cho trung tâm và giáo viên</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 32, lineHeight: 1.25, color: 'var(--ivory)', marginBottom: 16 }}>
            WriteRight cho trung tâm IELTS và giáo viên
          </h1>
          <p style={p}>
            Đưa chấm Writing của WriteRight vào lớp học của bạn. Học viên nhận phản hồi nhanh và có dẫn chứng; giáo viên dành thời gian cho phần chữa bài. UNICOACH đang nhận đăng ký đối tác thí điểm.
          </p>
          <a href="#lien-he" style={{ display: 'inline-block', marginTop: 20, padding: '12px 22px', borderRadius: 10, background: 'var(--imperial-gold)', color: '#11183a', fontFamily: 'var(--font-body)', fontWeight: 700, textDecoration: 'none' }}>
            Đăng ký đối tác thí điểm
          </a>
        </section>

        <section>
          <h2 style={h2}>Dành cho ai</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {audiences.map(([t, d]) => (
              <div key={t} style={card}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--champagne)', marginBottom: 4 }}>{t}</div>
                <div style={{ ...p, fontSize: 15 }}>{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={h2}>Bạn nhận được gì</h2>
          <ul style={{ ...p, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map(f => <li key={f}>{f}</li>)}
          </ul>
        </section>

        <section>
          <h2 style={h2}>Cách làm việc</h2>
          <ol style={{ ...p, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map(([t, d]) => (<li key={t}><strong style={{ color: 'var(--ivory)' }}>{t}.</strong> {d}</li>))}
          </ol>
        </section>

        <section>
          <h2 style={h2}>Lưu ý minh bạch</h2>
          <p style={{ ...p, fontSize: 15 }}>
            WriteRight chấm theo bộ tiêu chí band descriptors công khai của IELTS. Đây là điểm chấm của hệ thống, không phải điểm thi chính thức do IDP, British Council hay Cambridge cấp. Bài viết của học viên được xử lý theo <Link href="/privacy" style={{ color: 'var(--champagne)' }}>Chính sách bảo mật</Link> của WriteRight.
          </p>
        </section>

        <section id="lien-he" style={{ scrollMarginTop: 80 }}>
          <h2 style={h2}>Liên hệ với UNICOACH</h2>
          <p style={{ ...p, fontSize: 15, marginBottom: 20 }}>
            Để lại thông tin, chúng tôi sẽ liên hệ lại. Bạn cũng có thể email trực tiếp <a href="mailto:cs@unicoach.vn" style={{ color: 'var(--champagne)' }}>cs@unicoach.vn</a>.
          </p>
          <CentersLeadForm />
        </section>
      </main>
    </div>
  );
}
