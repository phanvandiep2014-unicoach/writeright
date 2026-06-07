'use client';
import Link from 'next/link';

const features = [
  { icon: '✦', title: 'Chấm điểm 4 tiêu chí', desc: 'Task Achievement, Lexical Resource, Grammar, Coherence — chuẩn IELTS.' },
  { icon: '✏', title: 'Sửa lỗi chi tiết', desc: 'AI phát hiện và giải thích từng lỗi ngữ pháp, từ vựng, collocation.' },
  { icon: '📝', title: 'Bài mẫu Band 9', desc: 'Tự động tạo mở bài mẫu Band 9 cho mọi đề bài.' },
  { icon: '📷', title: 'Chụp ảnh bài viết', desc: 'Chụp ảnh bài viết tay — AI đọc và chấm điểm ngay.' },
  { icon: '📊', title: 'Theo dõi tiến bộ', desc: 'Dashboard cá nhân, xem lịch sử điểm và sự tiến bộ.' },
  { icon: '🔮', title: 'Forecast đề thi', desc: 'Cập nhật đề dự đoán Writing mới nhất mỗi tháng.' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-sm">W</div>
            <span className="font-['DM_Serif_Display'] text-lg text-white">Luyen<span className="text-brand-400">Viet</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-navy-300 hover:text-white transition">Đăng nhập</Link>
            <Link href="/evaluate" className="text-sm bg-brand-500 text-navy-900 px-4 py-2 rounded-lg font-medium hover:bg-brand-400 transition">Chấm bài ngay</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-block mb-6 px-4 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-mono tracking-widest uppercase">
          AI-Powered · Free · Task 1 & 2
        </div>
        <h1 className="font-['DM_Serif_Display'] text-5xl md:text-6xl text-white leading-tight mb-6">
          Tự luyện IELTS Writing<br />
          <span className="text-brand-400 italic">hiệu quả mỗi ngày</span>
        </h1>
        <p className="text-navy-300 text-lg max-w-xl mx-auto mb-10">
          Dán bài luận hoặc chụp ảnh bài viết tay. Nhận điểm band, sửa lỗi chi tiết và bài mẫu Band 9 trong vài giây.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/evaluate" className="bg-brand-500 text-navy-900 px-8 py-3 rounded-xl font-['DM_Serif_Display'] text-lg hover:bg-brand-400 hover:-translate-y-0.5 transition-all shadow-lg shadow-brand-500/25">
            ✦ Chấm bài miễn phí
          </Link>
          <a href="#pricing" className="border border-navy-600 text-navy-200 px-8 py-3 rounded-xl font-mono text-sm hover:border-brand-500/50 transition">
            Xem bảng giá
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16">
          {[['4', 'Tiêu chí chấm'], ['9.0', 'Bài mẫu Band'], ['< 15s', 'Thời gian chấm']].map(([num, label]) => (
            <div key={label}>
              <div className="font-['DM_Serif_Display'] text-3xl text-brand-400">{num}</div>
              <div className="text-xs text-navy-400 font-mono tracking-wide uppercase mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="text-xs font-mono tracking-widest uppercase text-brand-400 mb-3">Tính năng</div>
          <h2 className="font-['DM_Serif_Display'] text-3xl text-white">Mọi thứ bạn cần để nâng Band Writing</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-brand-500/30 transition">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-['DM_Serif_Display'] text-lg text-white mb-2">{f.title}</h3>
              <p className="text-sm text-navy-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="text-xs font-mono tracking-widest uppercase text-brand-400 mb-3">Bảng giá</div>
          <h2 className="font-['DM_Serif_Display'] text-3xl text-white">Chọn gói phù hợp với bạn</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <div className="text-xs font-mono tracking-widest uppercase text-navy-400 mb-2">Miễn phí</div>
            <div className="font-['DM_Serif_Display'] text-3xl text-white mb-1">0 <span className="text-lg text-navy-400">VNĐ</span></div>
            <div className="text-sm text-navy-400 mb-6">/ tháng</div>
            <ul className="space-y-3 text-sm text-navy-200 mb-8">
              <li>✓ 5 lượt chấm điểm / tháng</li>
              <li>✓ Sửa lỗi cơ bản</li>
              <li>✓ Bài mẫu mở bài Band 9</li>
              <li className="text-navy-500">✗ Chấm chi tiết 4 tiêu chí</li>
              <li className="text-navy-500">✗ Chụp ảnh bài viết</li>
            </ul>
            <Link href="/evaluate" className="block text-center border border-navy-600 text-navy-200 py-2.5 rounded-lg text-sm hover:border-brand-500/50 transition">Bắt đầu miễn phí</Link>
          </div>

          {/* Standard — highlighted */}
          <div className="bg-navy-800 border-2 border-brand-500 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-navy-900 text-xs font-mono font-bold px-3 py-0.5 rounded-full">PHỔ BIẾN</div>
            <div className="text-xs font-mono tracking-widest uppercase text-brand-400 mb-2">Standard</div>
            <div className="font-['DM_Serif_Display'] text-3xl text-white mb-1">90.000 <span className="text-lg text-navy-400">VNĐ</span></div>
            <div className="text-sm text-navy-400 mb-6">/ tháng</div>
            <ul className="space-y-3 text-sm text-navy-200 mb-8">
              <li>✓ Chấm điểm không giới hạn</li>
              <li>✓ Chấm chi tiết 4 tiêu chí</li>
              <li>✓ Sửa lỗi + giải thích</li>
              <li>✓ Bài mẫu Band 9</li>
              <li>✓ Theo dõi tiến bộ</li>
            </ul>
            <Link href="/login" className="block text-center bg-brand-500 text-navy-900 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-400 transition">Đăng ký ngay</Link>
          </div>

          {/* Premium */}
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <div className="text-xs font-mono tracking-widest uppercase text-navy-400 mb-2">Premium</div>
            <div className="font-['DM_Serif_Display'] text-3xl text-white mb-1">150.000 <span className="text-lg text-navy-400">VNĐ</span></div>
            <div className="text-sm text-navy-400 mb-6">/ tháng</div>
            <ul className="space-y-3 text-sm text-navy-200 mb-8">
              <li>✓ Mọi tính năng Standard</li>
              <li>✓ Chụp ảnh bài viết tay</li>
              <li>✓ Phân tích từ vựng nâng cao</li>
              <li>✓ So sánh side-by-side</li>
              <li>✓ Forecast đề thi hàng tháng</li>
            </ul>
            <Link href="/login" className="block text-center border border-navy-600 text-navy-200 py-2.5 rounded-lg text-sm hover:border-brand-500/50 transition">Chọn Premium</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="font-['DM_Serif_Display'] text-3xl text-white mb-4">Sẵn sàng nâng Band Writing?</h2>
        <p className="text-navy-300 mb-8">Hàng nghìn học sinh đang luyện writing mỗi ngày. Còn chần chừ gì nữa?</p>
        <Link href="/evaluate" className="inline-block bg-brand-500 text-navy-900 px-10 py-3 rounded-xl font-['DM_Serif_Display'] text-lg hover:bg-brand-400 transition">
          Chấm bài ngay →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-navy-500 font-mono">
          <span>© 2026 LuyenViet · UNICOACH</span>
          <span>Powered by Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
