import type { Metadata } from 'next';
import './globals.css';
import './writeright-theme.css';

export const metadata: Metadata = {
  title: 'WriteRight — Tự Luyện IELTS Writing Hiệu Quả',
  description: 'Tự luyện IELTS Writing hiệu quả với AI chấm điểm chuẩn, sửa lỗi chi tiết và bài mẫu Band 9.',
  openGraph: {
    title: 'WriteRight — Tự Luyện IELTS Writing Hiệu Quả',
    description: 'AI chấm điểm Writing chuẩn IELTS. Sửa lỗi, cải thiện, nâng Band ngay.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-navy-900 text-gray-300 font-serif antialiased">
        {children}
      </body>
    </html>
  );
}
