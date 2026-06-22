import type { Metadata } from 'next';
import './globals.css';
import './writeright-theme.css';

export const metadata: Metadata = {
  title: 'WriteRight — Practice IELTS Writing Effectively',
  description: 'Practice IELTS Writing effectively with accurate AI scoring, detailed corrections, and Band 9 samples.',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'WriteRight by UNICOACH — AI IELTS Writing Coach',
    description: 'AI scores your Writing to official IELTS standards. Fix errors, improve, and raise your Band now.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WriteRight — AI IELTS Writing Coach',
    description: 'Get examiner-quality feedback on your IELTS essays in seconds.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
