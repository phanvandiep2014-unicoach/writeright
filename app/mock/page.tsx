/**
 * Server component — chỉ để đọc cookie httpOnly rồi giao việc cho MockClient.
 *
 * `/sso` đặt `uc_mock_session` + `uc_minutes` khi đây là chặng Writing của
 * bài thi thử 4 kỹ năng (xem BAN-GIAO-DOI-TAC.md phía LMS). Cookie httpOnly
 * nên PHẢI đọc ở server — component client (MockClient) không thấy được,
 * và học viên cũng vậy, đúng như thiết kế.
 */
import { cookies } from 'next/headers';
import MockClient from './MockClient';

// Kết quả phụ thuộc cookie của từng học viên — không được cache tĩnh.
export const dynamic = 'force-dynamic';

export default async function MockPage() {
  const jar = await cookies();
  const mockSession = jar.get('uc_mock_session')?.value || null;
  const minutesRaw = Number(jar.get('uc_minutes')?.value);
  const examMinutes = mockSession ? (minutesRaw > 0 ? minutesRaw : 60) : null;

  return <MockClient examMinutes={examMinutes} />;
}
