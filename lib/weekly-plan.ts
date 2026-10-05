// Kế hoạch tuần + "Bước tiếp theo" cho Học bạ tuần trên dashboard.
// Hàm thuần: nhận dữ liệu đã đọc + ngày hôm nay (YYYY-MM-DD giờ VN), không đọc đồng hồ.
// Chỉ tiêu tuần lấy từ planFor (lib/goal.ts) để khớp với trang /practice/progress.

import type { Criterion, ExerciseKind } from './skill-exercises';
import { CRITERION_LABEL, KIND_META } from './skill-exercises';

export interface WeekInput {
  today: string;               // YYYY-MM-DD (giờ VN)
  essayDays: string[];         // ngày (VN) của từng bài chấm trong tuần này
  drillDays: string[];         // ngày (VN) của từng kết quả bài tập kỹ năng trong tuần này
  essaysTarget: number;        // planFor().essaysPerWeek, hoặc mặc định
  drillTarget: number;         // planFor().drillDaysPerWeek, hoặc mặc định
  focus: Criterion | null;     // tiêu chí yếu nhất
  todayKind: ExerciseKind;     // recommendToday().kind
}

export interface NextStep {
  kind: 'essay' | 'drill' | 'done';
  label: string;
  href: string | null;
  why: string;
}

export interface WeekPlan {
  essaysDone: number;
  essaysTarget: number;
  drillDaysDone: number;
  drillTarget: number;
  next: NextStep;
}

/** Mặc định khi chưa đặt mục tiêu: 2 bài/tuần, 4 ngày bài tập kỹ năng. */
export const DEFAULT_ESSAYS = 2;
export const DEFAULT_DRILL_DAYS = 4;

/**
 * Thứ tự ưu tiên trong ngày: còn thiếu bài viết và hôm nay chưa viết → viết bài;
 * rồi đến bài tập kỹ năng nếu hôm nay chưa làm và tuần còn thiếu;
 * mỗi ngày tối đa một việc chính để không biến dashboard thành danh sách việc dồn.
 */
export function weekPlan(i: WeekInput): WeekPlan {
  const essaysDone = i.essayDays.length;
  const drillDaysDone = new Set(i.drillDays).size;
  const essayToday = i.essayDays.includes(i.today);
  const drillToday = i.drillDays.includes(i.today);
  const essaysLeft = Math.max(0, i.essaysTarget - essaysDone);
  const drillLeft = Math.max(0, i.drillTarget - drillDaysDone);
  const focusNote = i.focus
    ? ` Khi viết, chú tâm vào ${CRITERION_LABEL[i.focus].name} — tiêu chí đang thấp nhất của bạn.`
    : '';
  const drillHref = `/practice/skills?kind=${i.todayKind}`;
  const drillLabel = `Làm 8 câu ${KIND_META[i.todayKind].label}`;

  let next: NextStep;
  if (essaysLeft > 0 && !essayToday) {
    next = {
      kind: 'essay', label: 'Viết và chấm 1 bài', href: '/evaluate',
      why: `Còn ${essaysLeft} bài để đủ chỉ tiêu tuần.${focusNote}`,
    };
  } else if (drillLeft > 0 && !drillToday) {
    next = {
      kind: 'drill', label: drillLabel, href: drillHref,
      why: `Khoảng 5 phút, không tốn lượt chấm. Còn ${drillLeft} ngày luyện kỹ năng để đủ chỉ tiêu tuần.`,
    };
  } else if (essaysLeft === 0 && drillLeft === 0) {
    next = {
      kind: 'done', label: 'Luyện thêm (tuỳ chọn)', href: drillHref,
      why: 'Bạn đã đủ chỉ tiêu tuần này. Giữ nhịp đều quan trọng hơn làm dồn.',
    };
  } else {
    next = {
      kind: 'done', label: 'Hôm nay xong rồi', href: null,
      why: 'Phần việc hôm nay đã xong. Hẹn bạn ngày mai.',
    };
  }
  return { essaysDone, essaysTarget: i.essaysTarget, drillDaysDone, drillTarget: i.drillTarget, next };
}
