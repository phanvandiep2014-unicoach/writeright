import type { Metadata } from 'next';
import ProgressClient from './ProgressClient';

export const metadata: Metadata = {
  title: 'Tiến bộ luyện tập — WriteRight by UNICOACH',
  description: 'Xu hướng band, hồ sơ lỗi, chuỗi ngày luyện và bài tập gợi ý cho hôm nay.',
};

export default function ProgressPage() {
  return <ProgressClient />;
}
