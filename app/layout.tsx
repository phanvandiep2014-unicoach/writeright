import type { Metadata } from 'next';
import { Cinzel_Decorative, Cinzel, Cormorant_Garamond, EB_Garamond } from 'next/font/google';
import './globals.css';
import './writeright-theme.css';

/* ============================================================
   Brand fonts â loaded via next/font so the @font-face rules
   are injected directly into <head>, not via a CSS @import that
   gets buried mid-stylesheet by the bundler (which made every
   brand font silently fail to load). next/font also self-hosts
   the font files, so there's no external Google Fonts request
   at all on page load.
   ============================================================ */
const cinzelDecorative = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel-decorative',
  display: 'swap',
});
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const ebGaramond = EB_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WriteRight by UNICOACH — Luyện IELTS Writing cùng mentor AI',
  description: 'Chấm bài IELTS Writing chuẩn 4 tiêu chí, sửa lỗi chi tiết song ngữ và bài mẫu Band 9. Bắt đầu từ bạn — cùng nhau vươn tới band mục tiêu.',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'WriteRight by UNICOACH — AI IELTS Writing Coach',
    description: 'AI chấm Writing chuẩn IELTS: điểm 4 tiêu chí, sửa lỗi song ngữ, bài mẫu Band 9. Nâng band ngay.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WriteRight — AI IELTS Writing Coach',
    description: 'Nhận phản hồi chuẩn giám khảo cho bài IELTS Writing trong vài giây.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${cinzelDecorative.variable} ${cinzel.variable} ${cormorant.variable} ${ebGaramond.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
