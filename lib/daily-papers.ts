// "Đề thi chung theo ngày" — giáo viên upload MỘT bộ đề (Task 1 + Task 2)
// dùng cho buổi thi thử IELTS hàng tháng tại trung tâm. Mọi học viên tham
// gia buổi thi hôm đó làm CHUNG một đề, thay vì mỗi người một đề khác nhau
// như ở /mock luyện tập tự do (xem lib/writing-papers.ts) — để giáo viên
// chấm chữa và hỗ trợ sau thi dễ so sánh giữa các học viên.
//
// Bảng `mock_daily_papers` (sql/daily-mock-papers.sql): một hàng = đề của
// một ngày (unique theo exam_date). Task 1 lưu nguyên dạng Task1Item (cùng
// kiểu dữ liệu với ngân hàng đề có sẵn) nên toàn bộ pipeline hiện có — vẽ
// SVG (TaskChart), chuyển thành chữ cho AI chấm (task1ToText) — dùng lại
// được 100%, không cần sửa gì thêm.

import { Task1Item, Task2Item } from './writing-tasks';
import { TestPaper } from './writing-papers';

export interface DailyPaperRow {
  id: string;
  exam_date: string; // YYYY-MM-DD
  title: string | null;
  task1: Task1Item;
  task2_prompt: string;
  task2_type: Task2Item['type'];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedDailyPaper {
  paper: TestPaper;
  task1: Task1Item;
  task2: Task2Item;
  examDate: string;
  title: string | null;
}

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD — tra đề phải theo giờ
 * trung tâm, không theo giờ máy chủ Vercel (UTC) kẻo lệch ngày quanh nửa đêm. */
export function todayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function toResolvedDailyPaper(row: DailyPaperRow): ResolvedDailyPaper {
  const task1: Task1Item = { ...row.task1, id: row.task1.id || `daily-${row.exam_date}-t1` };
  const task2: Task2Item = {
    id: `daily-${row.exam_date}-t2`,
    category: 'daily',
    type: row.task2_type,
    prompt: row.task2_prompt,
  };
  const label = row.title?.trim() || `Đề thi chung ngày ${row.exam_date.split('-').reverse().join('/')}`;
  return {
    paper: {
      id: `DAILY-${row.exam_date}`,
      no: 0,
      level: 'standard',
      task1Id: task1.id,
      task2Id: task2.id,
      focus: label,
    },
    task1,
    task2,
    examDate: row.exam_date,
    title: row.title,
  };
}
