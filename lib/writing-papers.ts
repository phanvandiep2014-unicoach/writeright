// Bộ "đề thi gợi ý" cho Thi thử Writing — mỗi đề ghép SẴN một Task 1 với một
// Task 2 lấy từ ngân hàng trong `writing-tasks.ts`, đánh số như đề trong sách
// Cambridge để học viên làm tuần tự và giáo viên giao được theo tên đề.
//
// Vì sao KHÔNG ghép Task 1 và Task 2 cùng chủ đề: đề thi thật không bao giờ
// làm vậy. Ghép cùng chủ đề tạo lợi thế giả — học viên mang từ vựng vừa dùng
// ở Task 1 sang Task 2 và tưởng mình viết tốt hơn thực tế. Ở đây chủ đề được
// cố tình tách xa nhau, chỉ có ĐỘ KHÓ là được cân.
//
// Nguyên tắc phủ ngân hàng: 18 đề chạm đủ 6 dạng Task 1 (bar, line, pie,
// table, process, map) và đủ 5 dạng Task 2 (opinion, discussion,
// problem-solution, adv-disadv, two-part). Học viên làm hết 18 đề là đã gặp
// mọi dạng câu hỏi ít nhất hai lần.

import { TASK1_BANK, TASK2_BANK, Task1Item, Task2Item } from './writing-tasks';

export type PaperLevel = 'foundation' | 'standard' | 'challenge';

export interface TestPaper {
  /** Mã đề, hiện trên giao diện và lưu vào CSDL. */
  id: string;
  /** Số thứ tự để hiện "Đề 01". */
  no: number;
  level: PaperLevel;
  task1Id: string;
  task2Id: string;
  /** Một câu nói rõ đề này rèn kỹ năng gì — đây là lý do đề tồn tại. */
  focus: string;
}

export const LEVEL_LABEL: Record<PaperLevel, string> = {
  foundation: 'Nền tảng',
  standard: 'Tiêu chuẩn',
  challenge: 'Thử thách',
};

export const LEVEL_HINT: Record<PaperLevel, string> = {
  foundation: 'Số liệu gọn, đề luận quen thuộc — hợp với band mục tiêu 5.5–6.5.',
  standard: 'Đúng độ khó một đề thi trung bình — hợp với band mục tiêu 6.0–7.0.',
  challenge: 'Nhiều chuỗi số liệu hoặc đề luận hai vế — hợp với band mục tiêu 7.0+.',
};

export const TEST_PAPERS: TestPaper[] = [
  // ── Nền tảng: một biến, một trục thời gian, đề luận một chiều ──────────
  { id: 'P01', no: 1, level: 'foundation', task1Id: 'bar-01', task2Id: 't2-op-02',
    focus: 'So sánh hai mốc thời gian trên cùng một biểu đồ cột; bài luận nêu quan điểm một chiều.' },
  { id: 'P02', no: 2, level: 'foundation', task1Id: 'line-03', task2Id: 't2-ad-03',
    focus: 'Mô tả đường biến thiên theo mùa và nêu tương phản rõ rệt; bài luận cân lợi và hại.' },
  { id: 'P03', no: 3, level: 'foundation', task1Id: 'pie-02', task2Id: 't2-op-05',
    focus: 'Diễn giải thay đổi tỷ trọng giữa hai biểu đồ tròn; bài luận về ưu tiên chi ngân sách.' },
  { id: 'P04', no: 4, level: 'foundation', task1Id: 'bar-04', task2Id: 't2-ps-01',
    focus: 'Đọc tương phản mạnh giữa hai thành phố; bài luận nguyên nhân – giải pháp cùng lĩnh vực giao thông.' },
  { id: 'P05', no: 5, level: 'foundation', task1Id: 'table-03', task2Id: 't2-tp-03',
    focus: 'Chọn lọc số liệu trong bảng thay vì liệt kê hết; bài luận hai câu hỏi về sức khoẻ tinh thần.' },

  // ── Tiêu chuẩn: nhiều chuỗi số liệu, đề luận hai chiều ────────────────
  { id: 'P06', no: 6, level: 'standard', task1Id: 'line-01', task2Id: 't2-di-01',
    focus: 'Nhóm ba đường có tốc độ tăng khác nhau; bài luận thảo luận hai quan điểm giáo dục.' },
  { id: 'P07', no: 7, level: 'standard', task1Id: 'bar-06', task2Id: 't2-ps-06',
    focus: 'Diễn giải mức tăng rất chênh lệch giữa các nước; bài luận ô nhiễm nhựa.' },
  { id: 'P08', no: 8, level: 'standard', task1Id: 'pie-01', task2Id: 't2-op-04',
    focus: 'So sánh cơ cấu chi tiêu hai quốc gia; bài luận về làm việc từ xa.' },
  { id: 'P09', no: 9, level: 'standard', task1Id: 'table-01', task2Id: 't2-ad-02',
    focus: 'Tìm xu hướng ẩn trong bảng nhiều cột; bài luận lợi và hại của du lịch bùng nổ.' },
  { id: 'P10', no: 10, level: 'standard', task1Id: 'line-05', task2Id: 't2-di-03',
    focus: 'Mô tả đường có đỉnh và đáy rõ; bài luận thảo luận về xử lý người phạm tội vị thành niên.' },
  { id: 'P11', no: 11, level: 'standard', task1Id: 'process-01', task2Id: 't2-op-08',
    focus: 'Viết quy trình bằng thể bị động và từ nối trình tự; bài luận về mạng xã hội.' },
  { id: 'P12', no: 12, level: 'standard', task1Id: 'map-01', task2Id: 't2-ps-04',
    focus: 'Mô tả thay đổi bản đồ bằng thì quá khứ và phương hướng; bài luận nhà ở giá rẻ.' },
  { id: 'P13', no: 13, level: 'standard', task1Id: 'pie-04', task2Id: 't2-di-05',
    focus: 'Nêu bật lát cắt đổi ngôi giữa hai mốc; bài luận thảo luận về quảng cáo.' },

  // ── Thử thách: dữ liệu dày, đề luận trừu tượng hoặc hai vế ────────────
  { id: 'P14', no: 14, level: 'challenge', task1Id: 'bar-03', task2Id: 't2-di-06',
    focus: 'Ba nhóm số liệu chênh nhau hàng chục lần — buộc phải chọn lọc; bài luận trừu tượng về tự do sáng tạo.' },
  { id: 'P15', no: 15, level: 'challenge', task1Id: 'line-04', task2Id: 't2-tp-01',
    focus: 'Bốn đường cắt nhau, cần nhóm hợp lý; bài luận hai câu hỏi về tự doanh.' },
  { id: 'P16', no: 16, level: 'challenge', task1Id: 'table-02', task2Id: 't2-op-06',
    focus: 'Bảng có hai đơn vị đo khác nhau; bài luận về tài năng bẩm sinh và nỗ lực.' },
  { id: 'P17', no: 17, level: 'challenge', task1Id: 'process-02', task2Id: 't2-ad-05',
    focus: 'Quy trình nhiều nhánh; bài luận lợi và hại của AI trong công việc.' },
  { id: 'P18', no: 18, level: 'challenge', task1Id: 'map-02', task2Id: 't2-op-07',
    focus: 'Bản đồ có nhiều khu vực thay đổi cùng lúc; bài luận quan điểm gây tranh cãi về vườn thú.' },
];

/** Tra đề theo mã. Trả về null nếu mã không tồn tại (dữ liệu cũ trong CSDL). */
export function findPaper(id: string): TestPaper | null {
  return TEST_PAPERS.find(p => p.id === id) ?? null;
}

/**
 * Lấy hai đề bài thật của một paper. Ném lỗi khi id trỏ vào đề không còn tồn
 * tại — lỗi này phải nổ lúc dev chứ không được im lặng cho học viên vào phòng
 * thi rồi mới phát hiện thiếu đề.
 */
export function resolvePaper(paper: TestPaper): { task1: Task1Item; task2: Task2Item } {
  const task1 = TASK1_BANK.find(t => t.id === paper.task1Id);
  const task2 = TASK2_BANK.find(t => t.id === paper.task2Id);
  if (!task1) throw new Error(`[papers] ${paper.id}: không tìm thấy Task 1 "${paper.task1Id}"`);
  if (!task2) throw new Error(`[papers] ${paper.id}: không tìm thấy Task 2 "${paper.task2Id}"`);
  return { task1, task2 };
}

/**
 * Đề gợi ý kế tiếp: đề có số nhỏ nhất mà học viên chưa làm. Hết 18 đề thì
 * quay lại đề 1 — lúc đó lặp lại là có ích, vì viết lại cùng một đề sau vài
 * tuần là cách đo tiến bộ sạch nhất.
 */
export function nextPaper(donePaperIds: string[]): TestPaper {
  const done = new Set(donePaperIds);
  return TEST_PAPERS.find(p => !done.has(p.id)) ?? TEST_PAPERS[0];
}
