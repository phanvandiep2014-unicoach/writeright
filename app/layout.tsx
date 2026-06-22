import type { Metadata } from 'next';
import './globals.css';
import './writeright-theme.css';

export const metadata: Metadata = {
  title: 'WriteRight — Practice IELTS Writing Effectively',
  description: 'Practice IELTS Writing effectively with accurate AI scoring, detailed corrections, and Band 9 samples.',
  openGraph: {
    title: 'WriteRight — Practice IELTS Writing Effectively',
    description: 'AI scores your Writing to official IELTS standards. Fix errors, improve, and raise your Band now.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="min-h-screen bg-navy-900 text-gray-300 antialiased">{children}</body></html>
    );
}
