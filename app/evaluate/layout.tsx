import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chấm bài IELTS Writing — WriteRight by UNICOACH',
  description: 'Dán bài luận hoặc ảnh bài viết tay — nhận điểm band 4 tiêu chí, sửa lỗi chi tiết và bài mẫu Band 9 trong vài giây.',
  openGraph: {
    title: 'Chấm bài IELTS Writing — WriteRight by UNICOACH',
    description: 'AI chấm Writing chuẩn IELTS: điểm 4 tiêu chí, sửa lỗi song ngữ, bài mẫu Band 9.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chấm bài IELTS Writing — WriteRight',
    description: 'Nhận phản hồi chuẩn giám khảo cho bài IELTS Writing trong vài giây.',
    images: ['/og-image.png'],
  },
};

export default function EvaluateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
