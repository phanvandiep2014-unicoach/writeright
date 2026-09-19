import type { Metadata } from 'next';
import SkillsClient from './SkillsClient';

export const metadata: Metadata = {
  title: 'Bài tập kỹ năng IELTS Writing — WriteRight by UNICOACH',
  description: 'Bài tập ngắn 3–5 phút: sửa lỗi ngữ pháp, paraphrase, liên kết ý, kết hợp từ, overview. Chấm tức thì, không tốn lượt chấm.',
};

export default function SkillsPage() {
  return <SkillsClient />;
}
