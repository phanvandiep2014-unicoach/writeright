// Phần "Luyện tập" — danh mục đề thống nhất, xây trên ngân hàng đề có sẵn trong
// lib/writing-tasks.ts (không nhân đôi dữ liệu, không cần bảng DB mới cho đề).
//
// Một "đề luyện tập" = một mục của TASK1_BANK hoặc TASK2_BANK. Đề được nhận ra
// khi học viên đã làm nhờ so khớp chính văn bản đề với `evaluations.task_prompt`
// (Task 1 lưu bằng task1ToText, Task 2 lưu nguyên câu đề) — nên /practice và
// /evaluate?practice=<id> phải luôn dùng cùng giá trị `promptText` dưới đây.

import {
  TASK1_BANK, TASK2_BANK, Task1Item, Task2Item, ChartType, task1ToText,
} from './writing-tasks';

export type PracticeTask = 1 | 2;

export interface PracticeItem {
  id: string;
  task: PracticeTask;
  /** Dạng bài: bar/line/pie/table/process/map (Task 1) hoặc opinion/discussion/... (Task 2). */
  kind: string;
  category: string;
  title: string;
  /** Văn bản đề đầy đủ, đúng như được gửi cho bộ chấm và lưu vào evaluations.task_prompt. */
  promptText: string;
  task1?: Task1Item;
}

export const KIND_LABEL: Record<string, string> = {
  bar: 'Bar chart',
  line: 'Line graph',
  pie: 'Pie chart',
  table: 'Table',
  process: 'Process',
  map: 'Map',
  opinion: 'Agree / disagree',
  discussion: 'Discussion (both views)',
  'problem-solution': 'Problem – solution',
  'adv-disadv': 'Advantages – disadvantages',
  'two-part': 'Two-part question',
};

export const CATEGORY_LABEL: Record<string, string> = {
  education: 'Education',
  technology: 'Technology',
  environment: 'Environment',
  health: 'Health',
  work: 'Work',
  society: 'Society',
  transport: 'Transport',
  economy: 'Economy',
  government: 'Government',
  media: 'Media',
  culture: 'Culture',
  family: 'Family',
  crime: 'Crime',
  travel: 'Travel',
};

export const categoryLabel = (c: string) =>
  CATEGORY_LABEL[c] || c.charAt(0).toUpperCase() + c.slice(1);

export const kindLabel = (k: string) => KIND_LABEL[k] || k;

function fromTask1(t: Task1Item): PracticeItem {
  return {
    id: t.id, task: 1, kind: t.chartType as ChartType, category: t.category,
    title: t.title, promptText: task1ToText(t), task1: t,
  };
}

function fromTask2(t: Task2Item): PracticeItem {
  return {
    id: t.id, task: 2, kind: t.type, category: t.category,
    title: t.prompt, promptText: t.prompt,
  };
}

/** Toàn bộ đề luyện tập — Task 2 trước vì phổ biến hơn với học viên tự học. */
export const PRACTICE_ITEMS: PracticeItem[] = [
  ...TASK2_BANK.map(fromTask2),
  ...TASK1_BANK.map(fromTask1),
];

export function findPracticeItem(id: string | null | undefined): PracticeItem | null {
  if (!id) return null;
  return PRACTICE_ITEMS.find(p => p.id === id) ?? null;
}

export interface PracticeFilter {
  task: 'all' | PracticeTask;
  kind: 'all' | string;
  category: 'all' | string;
  status: 'all' | 'todo' | 'done';
  query: string;
}

export const DEFAULT_FILTER: PracticeFilter = {
  task: 'all', kind: 'all', category: 'all', status: 'all', query: '',
};

/** Lịch sử làm của một đề: điểm cao nhất và số lần làm. */
export interface AttemptSummary { best: number | null; count: number; last: string }

export function applyFilter(
  items: PracticeItem[],
  f: PracticeFilter,
  attempts: Record<string, AttemptSummary>,
): PracticeItem[] {
  const q = f.query.trim().toLowerCase();
  return items.filter(p => {
    if (f.task !== 'all' && p.task !== f.task) return false;
    if (f.kind !== 'all' && p.kind !== f.kind) return false;
    if (f.category !== 'all' && p.category !== f.category) return false;
    const done = !!attempts[p.id];
    if (f.status === 'done' && !done) return false;
    if (f.status === 'todo' && done) return false;
    if (q && !p.title.toLowerCase().includes(q) && !p.promptText.toLowerCase().includes(q)) return false;
    return true;
  });
}

/**
 * Nhóm các bài đã chấm theo đề luyện tập bằng cách so văn bản đề.
 * `rows` lấy từ bảng evaluations của chính học viên (RLS đã giới hạn).
 */
export function summariseAttempts(
  rows: { task_prompt: string | null; overall_band: number | null; created_at: string }[],
): Record<string, AttemptSummary> {
  const byText = new Map<string, PracticeItem>();
  PRACTICE_ITEMS.forEach(p => byText.set(p.promptText.trim(), p));

  const out: Record<string, AttemptSummary> = {};
  for (const r of rows) {
    const item = r.task_prompt ? byText.get(r.task_prompt.trim()) : undefined;
    if (!item) continue;
    const cur = out[item.id];
    const band = r.overall_band == null ? null : Number(r.overall_band);
    if (!cur) {
      out[item.id] = { best: band, count: 1, last: r.created_at };
    } else {
      cur.count += 1;
      if (band != null && (cur.best == null || band > cur.best)) cur.best = band;
      if (r.created_at > cur.last) cur.last = r.created_at;
    }
  }
  return out;
}

/** Danh sách giá trị lọc có thật trong ngân hàng, giữ thứ tự xuất hiện. */
export function distinct(items: PracticeItem[], pick: (p: PracticeItem) => string): string[] {
  return Array.from(new Set(items.map(pick)));
}

/** Đề gợi ý: chưa làm, ưu tiên dạng bài học viên ít làm nhất. */
export function suggestNext(attempts: Record<string, AttemptSummary>): PracticeItem | null {
  const doneKinds: Record<string, number> = {};
  PRACTICE_ITEMS.forEach(p => {
    if (attempts[p.id]) doneKinds[`${p.task}:${p.kind}`] = (doneKinds[`${p.task}:${p.kind}`] || 0) + attempts[p.id].count;
  });
  const todo = PRACTICE_ITEMS.filter(p => !attempts[p.id]);
  if (!todo.length) return null;
  return [...todo].sort(
    (a, b) => (doneKinds[`${a.task}:${a.kind}`] || 0) - (doneKinds[`${b.task}:${b.kind}`] || 0),
  )[0];
}

/**
 * "Đề gợi ý tuần này": 3 đề cố định cho cả tuần (giờ Việt Nam, đổi vào thứ Hai) — 1 Task 1 + 2 Task 2
 * khác dạng nhau — để học viên cùng lớp luyện chung một bộ và giảng viên dễ chữa. Chỉ lấy từ ngân hàng
 * đề tự biên soạn có sẵn, không cần dữ liệu ngoài. Xác định theo số tuần nên không cần lưu DB.
 */
export function weekIndexICT(now: number = Date.now()): number {
  const ict = now + 7 * 3600_000;
  // Mốc 1970-01-01 là thứ Năm → thứ Hai đầu tiên cách 4 ngày để tuần bắt đầu từ thứ Hai.
  return Math.floor((ict - 4 * 86400_000) / (7 * 86400_000));
}

export function weeklyPicks(now: number = Date.now()): PracticeItem[] {
  const w = weekIndexICT(now);
  const at = <T,>(arr: T[], i: number) => arr[((i % arr.length) + arr.length) % arr.length];
  const t1 = PRACTICE_ITEMS.filter(p => p.task === 1);
  const t2 = PRACTICE_ITEMS.filter(p => p.task === 2);
  const t1Kinds = distinct(t1, p => p.kind), t2Kinds = distinct(t2, p => p.kind);
  const pickKind = (pool: PracticeItem[], kind: string, i: number) => {
    const same = pool.filter(p => p.kind === kind);
    return at(same, i);
  };
  const out: PracticeItem[] = [];
  if (t1.length) out.push(pickKind(t1, at(t1Kinds, w), Math.floor(w / Math.max(1, t1Kinds.length))));
  if (t2.length) {
    const k1 = at(t2Kinds, w), k2 = at(t2Kinds, w + 2);
    out.push(pickKind(t2, k1, Math.floor(w / Math.max(1, t2Kinds.length))));
    if (k2 !== k1) out.push(pickKind(t2, k2, Math.floor(w / Math.max(1, t2Kinds.length)) + 1));
  }
  return out;
}
