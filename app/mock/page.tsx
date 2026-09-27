/**
 * Server component — chỉ để đọc cookie httpOnly + tra đề thi chung hôm nay,
 * rồi giao việc cho MockClient.
 *
 * `/sso` đặt `uc_mock_session` + `uc_minutes` khi đây là chặng Writing của
 * bài thi thử 4 kỹ năng (xem BAN-GIAO-DOI-TAC.md phía LMS). Cookie httpOnly
 * nên PHẢI đọc ở server — component client (MockClient) không thấy được,
 * và học viên cũng vậy, đúng như thiết kế.
 *
 * Đề thi chung theo ngày (sql/daily-mock-papers.sql) cũng tra ở đây: nếu có
 * đề cho HÔM NAY (giờ Việt Nam), mọi học viên — dù vào qua chặng thi thử LMS
 * hay tự vào /mock luyện tập — đều thấy/làm chung đúng một đề đó. Không có
 * đề cho hôm nay thì mọi thứ y như cũ (đề gợi ý cá nhân hoá / random).
 */
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase-server';
import { toResolvedDailyPaper, todayStr, DailyPaperRow } from '@/lib/daily-papers';
import MockClient from './MockClient';

// Kết quả phụ thuộc cookie của từng học viên + đề của ngày hôm nay — không
// được cache tĩnh.
export const dynamic = 'force-dynamic';

export default async function MockPage() {
  const jar = await cookies();
  const mockSession = jar.get('uc_mock_session')?.value || null;
  const minutesRaw = Number(jar.get('uc_minutes')?.value);
  const examMinutes = mockSession ? (minutesRaw > 0 ? minutesRaw : 60) : null;

  // Bảng có thể chưa tồn tại (chưa chạy sql/daily-mock-papers.sql) hoặc chưa
  // có đề cho hôm nay — cả hai trường hợp đều rơi về null, không chặn trang.
  let dailyPaper = null;
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from('mock_daily_papers')
      .select('*')
      .eq('exam_date', todayStr())
      .maybeSingle();
    if (data) dailyPaper = toResolvedDailyPaper(data as DailyPaperRow);
  } catch {
    // im lặng — xem chú thích trên
  }

  return <MockClient examMinutes={examMinutes} dailyPaper={dailyPaper} />;
}
