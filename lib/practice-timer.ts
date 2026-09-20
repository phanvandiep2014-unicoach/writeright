// Đồng hồ luyện viết trên trang chấm bài: hàm thuần để kiểm thử được.
// Thời gian chuẩn IELTS: Task 1 = 20 phút, Task 2 = 40 phút. Số từ tối thiểu: 150 / 250.

export const TASK_MINUTES: Record<1 | 2, number> = { 1: 20, 2: 40 };
export const TASK_MIN_WORDS: Record<1 | 2, number> = { 1: 150, 2: 250 };

export const taskKey = (taskType: number): 1 | 2 => (taskType === 1 ? 1 : 2);

/** mm:ss, không âm. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export type TimerState = 'ok' | 'warn' | 'over';

/** ok: còn > 5 phút; warn: còn <= 5 phút; over: hết giờ. */
export function timerState(remainingSec: number): TimerState {
  if (remainingSec <= 0) return 'over';
  return remainingSec <= 300 ? 'warn' : 'ok';
}

/** Tốc độ viết (từ/phút) sau khi đã viết đủ 60 giây; null nếu chưa đủ dữ liệu. */
export function wordsPerMinute(words: number, elapsedSec: number): number | null {
  if (elapsedSec < 60) return null;
  return Math.round((words / elapsedSec) * 60);
}
