import type { Metadata } from 'next';
import PracticeClient from './PracticeClient';

export const metadata: Metadata = {
  title: 'Luyện tập IELTS Writing — WriteRight by UNICOACH',
  description: 'Chọn đề Task 1 và Task 2, viết bài, nhận band 4 tiêu chí; luyện thêm bài tập ngữ pháp, từ vựng, liên kết ý mỗi ngày.',
};

export default function PracticePage() {
  return <PracticeClient />;
}
