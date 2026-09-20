// Mục tiêu band + ngày thi → khoảng cách, nhịp tiến bộ cần thiết và kế hoạch tuần.
// Hàm thuần (không đọc đồng hồ, không đọc storage) để kiểm thử được; component lo phần lưu trữ.

import type { Criterion } from './skill-exercises';
import { CRITERIA } from './practice-insights';

/** Một dòng của bảng user_goals (do GoalRitual trên dashboard ghi). */
export interface Goal { target_band: number; exam_date: string | null }

const dayNum = (d: string) => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);

/** Số ngày từ `today` đến `examDate` (âm nếu đã qua). */
export function daysUntil(examDate: string, today: string): number {
  return dayNum(examDate) - dayNum(today);
}

/** Band hiện tại = trung bình `n` bài gần nhất có điểm (rows mới → cũ), làm tròn 0.1. */
export function currentBand(rows: { overall_band: number | null }[], n = 3): number | null {
  const v = rows.map(r => r.overall_band).filter((x): x is number => typeof x === 'number').slice(0, n).map(Number);
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

export type Pace = 'reached' | 'on-track' | 'stretch' | 'ambitious' | 'no-date' | 'exam-passed';

export interface GoalPlan {
  gap: number;              // >= 0
  daysLeft: number | null;
  weeksLeft: number | null;
  perWeek: number | null;   // band cần tăng mỗi tuần
  pace: Pace;
  essaysPerWeek: number;
  drillDaysPerWeek: number;
  focus: Criterion | null;  // tiêu chí yếu nhất
}

/**
 * Nhịp cần thiết: tăng dưới 0.1 band/tuần là khả thi, tới 0.25 là cần cố gắng,
 * cao hơn là rất tham vọng (điểm IELTS Writing hiếm khi tăng nhanh hơn thế).
 */
export function planFor(
  goal: Goal, current: number | null, today: string,
  avgs: Record<Criterion, number | null>,
): GoalPlan {
  const gap = current === null ? 0 : Math.max(0, Math.round((goal.target_band - current) * 10) / 10);
  const daysLeft = goal.exam_date ? daysUntil(goal.exam_date, today) : null;
  const weeksLeft = daysLeft === null ? null : Math.max(0, Math.ceil(daysLeft / 7));

  let pace: Pace;
  let perWeek: number | null = null;
  if (current !== null && gap === 0) pace = 'reached';
  else if (daysLeft === null) pace = 'no-date';
  else if (daysLeft < 0) pace = 'exam-passed';
  else {
    perWeek = gap / Math.max(1, weeksLeft!);
    pace = perWeek <= 0.1 ? 'on-track' : perWeek <= 0.25 ? 'stretch' : 'ambitious';
  }

  const essaysPerWeek = gap >= 1 ? 3 : gap >= 0.5 ? 2 : 1;
  const drillDaysPerWeek = gap >= 1 ? 5 : 4;
  const known = CRITERIA.filter(c => avgs[c] !== null);
  const focus = known.length
    ? [...known].sort((a, b) => (avgs[a]! - avgs[b]!) || CRITERIA.indexOf(a) - CRITERIA.indexOf(b))[0]
    : null;
  return { gap, daysLeft, weeksLeft, perWeek, pace, essaysPerWeek, drillDaysPerWeek, focus };
}
