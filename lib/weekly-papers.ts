// Đề Writing của bộ Weekly Mock Test (UNICOACH Mock Test nn) — TÁCH RIÊNG khỏi kho luyện tập P01–P18
// và khỏi TASK1_BANK/TASK2_BANK, để đề thi tuần không lọt vào trang luyện tập của học viên.
// LMS gọi bằng mã đề "MTnn" (vd "MT01"); mỗi tuần thêm một mục vào WEEKLY_PAPERS.
import { TEST_PAPERS } from './writing-papers';
import { TASK1_BANK, TASK2_BANK, Task1Item, Task2Item } from './writing-tasks';

export interface ResolvedPaper {
  paper: { id: string; level: string; focus: string };
  t1: Task1Item;
  t2: Task2Item;
}

const WEEKLY_PAPERS: Record<string, { focus: string; t1: Task1Item; t2: Task2Item }> = {
  MT01: {
    focus: 'UNICOACH Mock Test 1 (18/10/2026): Task 1 bảng điện tái tạo; Task 2 AI thay giáo viên.',
    t1: {
      id: 'mt01-t1', category: 'environment', chartType: 'table',
      title: 'Tỷ trọng điện tái tạo ở bốn nước châu Âu (%)',
      instruction: 'The table below shows the share of electricity generated from renewable sources (wind, solar, hydroelectric and biomass) in four European countries between 2015 and 2025, with projections for 2030. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      table: {
        headers: ['Country', '2015 (%)', '2020 (%)', '2025 (%)', '2030 (projected %)'],
        rows: [
          ['Denmark', 55.4, 65.2, 78.5, 88.0],
          ['Germany', 31.5, 45.3, 53.8, 65.0],
          ['Spain', 36.8, 44.0, 51.2, 60.0],
          ['United Kingdom', 24.6, 43.1, 48.7, 62.0],
        ],
      },
    },
    t2: {
      id: 'mt01-t2', category: 'education', type: 'discussion',
      prompt: 'Some people believe that artificial intelligence systems will soon replace human educators and university lecturers, providing a more personalised and cost-effective learning experience. Others argue that human interaction and mentorship remain irreplaceable. Discuss both these views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
    },
  },
};

/** Tra đề theo mã: đề tuần (MTnn) trước, rồi đến kho P01–P18. Trả về null nếu không có. */
export function resolvePaper(rawId: unknown): ResolvedPaper | null {
  const id = String(rawId || '').toUpperCase();
  const w = WEEKLY_PAPERS[id];
  if (w) return { paper: { id, level: 'weekly', focus: w.focus }, t1: w.t1, t2: w.t2 };
  const p = TEST_PAPERS.find(x => x.id === id);
  const t1 = p && TASK1_BANK.find(t => t.id === p.task1Id);
  const t2 = p && TASK2_BANK.find(t => t.id === p.task2Id);
  if (!p || !t1 || !t2) return null;
  return { paper: { id: p.id, level: p.level, focus: p.focus }, t1, t2 };
}

export const WEEKLY_PAPER_IDS = Object.keys(WEEKLY_PAPERS);
