// Giai đoạn 2 của Luyện tập — hồ sơ lỗi, "Bài tập hôm nay", chuỗi ngày, xu hướng band.
// Toàn bộ là hàm thuần, tính từ dữ liệu ĐÃ CÓ (evaluations + exercise_results):
// không cần bảng mới, không gọi AI, dễ kiểm thử (scripts/check-practice.ts).

import type { Criterion, ExerciseKind } from './skill-exercises';
import { CRITERION_LABEL } from './skill-exercises';

export interface EvalRow {
  created_at: string;
  overall_band: number | null;
  ta_band: number | null;
  cc_band: number | null;
  lr_band: number | null;
  gra_band: number | null;
  /** feedback.error_corrections của bộ chấm; null nếu không lấy được. */
  error_corrections?: { category?: string }[] | null;
}

export interface ExerciseRow {
  created_at: string;
  kind: string;
  criterion: string;
  correct: boolean;
}

export const CRITERIA: Criterion[] = ['ta', 'cc', 'lr', 'gra'];

/** Nhãn hiển thị cho từng loại lỗi bộ chấm gán (evaluate/route.ts: category). */
export const ERROR_LABEL: Record<string, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  register: 'Văn phong',
  tone: 'Sắc thái',
  reference: 'Quy chiếu',
  dialect: 'Phương ngữ',
  spelling: 'Chính tả',
};

/** Loại lỗi ảnh hưởng chủ yếu tới tiêu chí nào — dùng để chọn bài tập bù. */
export const ERROR_TO_CRITERION: Record<string, Criterion> = {
  grammar: 'gra',
  vocabulary: 'lr',
  register: 'lr',
  tone: 'lr',
  spelling: 'lr',
  dialect: 'lr',
  reference: 'cc',
};

/** Tiêu chí yếu → dạng bài tập kỹ năng luyện đúng chỗ đó. `alt` đảo qua lại theo ngày. */
const CRITERION_TO_KINDS: Record<Criterion, ExerciseKind[]> = {
  gra: ['grammar'],
  cc: ['linking'],
  lr: ['collocation'],
  ta: ['overview', 'paraphrase'],
};

// ───────────────────────── Ngày & chuỗi ─────────────────────────

/** Ngày theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD. */
export function ictDay(iso: string | number | Date): string {
  const t = iso instanceof Date ? iso.getTime() : typeof iso === 'number' ? iso : Date.parse(iso);
  return new Date(t + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

const dayNumber = (d: string) => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);

export interface Streak { current: number; longest: number; activeToday: boolean }

/**
 * Chuỗi ngày luyện. Hôm nay chưa luyện thì chuỗi vẫn còn nếu hôm qua có luyện
 * (còn cả ngày để giữ chuỗi) — chỉ đứt khi bỏ qua trọn một ngày.
 */
export function computeStreak(days: Iterable<string>, today: string): Streak {
  const nums = Array.from(new Set(Array.from(days).map(dayNumber))).sort((a, b) => a - b);
  const set = new Set(nums);
  const t = dayNumber(today);

  let longest = 0, run = 0, prev: number | null = null;
  for (const n of nums) {
    run = prev !== null && n === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = n;
  }

  const activeToday = set.has(t);
  let cursor = activeToday ? t : set.has(t - 1) ? t - 1 : null;
  let current = 0;
  while (cursor !== null && set.has(cursor)) { current++; cursor--; }
  return { current, longest, activeToday };
}

/** Gộp ngày hoạt động từ bài chấm và bài tập kỹ năng. */
export function activityDays(evals: { created_at: string }[], exercises: { created_at: string }[]): Set<string> {
  const s = new Set<string>();
  evals.forEach(e => s.add(ictDay(e.created_at)));
  exercises.forEach(e => s.add(ictDay(e.created_at)));
  return s;
}

// ───────────────────────── Band & lỗi ─────────────────────────

const BAND_KEY: Record<Criterion, keyof EvalRow> = {
  ta: 'ta_band', cc: 'cc_band', lr: 'lr_band', gra: 'gra_band',
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Trung bình band từng tiêu chí trên `n` bài gần nhất (rows sắp mới → cũ). */
export function criterionAverages(rows: EvalRow[], n = 5): Record<Criterion, number | null> {
  const recent = rows.slice(0, n);
  const out = {} as Record<Criterion, number | null>;
  for (const c of CRITERIA) {
    out[c] = mean(recent.map(r => r[BAND_KEY[c]]).filter((v): v is number => typeof v === 'number').map(Number));
  }
  return out;
}

export interface ErrorProfile {
  counts: Record<string, number>;
  total: number;
  /** Số lỗi quy về từng tiêu chí. */
  byCriterion: Record<Criterion, number>;
  /** Số bài có dữ liệu lỗi được tính. */
  evalsCounted: number;
}

/** Đếm loại lỗi trong `n` bài gần nhất. Bài không có dữ liệu lỗi bị bỏ qua, không tính là 0 lỗi. */
export function errorProfile(rows: EvalRow[], n = 10): ErrorProfile {
  const counts: Record<string, number> = {};
  const byCriterion: Record<Criterion, number> = { ta: 0, cc: 0, lr: 0, gra: 0 };
  let total = 0, evalsCounted = 0;
  for (const r of rows.slice(0, n)) {
    if (!Array.isArray(r.error_corrections)) continue;
    evalsCounted++;
    for (const e of r.error_corrections) {
      const cat = e?.category && ERROR_LABEL[e.category] ? e.category : 'grammar';
      counts[cat] = (counts[cat] || 0) + 1;
      byCriterion[ERROR_TO_CRITERION[cat]]++;
      total++;
    }
  }
  return { counts, total, byCriterion, evalsCounted };
}

export function topErrors(p: ErrorProfile, limit = 3): { category: string; count: number }[] {
  return Object.entries(p.counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
    .slice(0, limit);
}

/** Xu hướng band tổng theo thời gian (cũ → mới), bỏ bài không có điểm. */
export function bandTrend(rows: EvalRow[], n = 20): { t: string; band: number }[] {
  return rows
    .filter(r => typeof r.overall_band === 'number')
    .slice(0, n)
    .map(r => ({ t: r.created_at, band: Number(r.overall_band) }))
    .reverse();
}

/** Độ chính xác bài tập kỹ năng theo tiêu chí. */
export function exerciseAccuracy(rows: ExerciseRow[]): Record<Criterion, { ok: number; total: number }> {
  const out = { ta: { ok: 0, total: 0 }, cc: { ok: 0, total: 0 }, lr: { ok: 0, total: 0 }, gra: { ok: 0, total: 0 } };
  for (const r of rows) {
    const c = r.criterion as Criterion;
    if (!(c in out)) continue;
    out[c].total++;
    if (r.correct) out[c].ok++;
  }
  return out;
}

// ───────────────────────── Bài tập hôm nay ─────────────────────────

export interface TodayPlan {
  criterion: Criterion;
  kind: ExerciseKind;
  reason: string;
  basis: 'bands' | 'default';
}

/**
 * Chọn dạng bài tập kỹ năng cho hôm nay.
 *  1. Có bài chấm: tiêu chí có band trung bình thấp nhất; hoà thì tiêu chí nhiều lỗi hơn.
 *  2. Chưa có bài chấm: xoay vòng bốn tiêu chí theo ngày để học viên mới vẫn có gợi ý.
 * Không dùng ngẫu nhiên: cùng một ngày, cùng dữ liệu → cùng gợi ý (không nhảy khi tải lại trang).
 */
export function recommendToday(rows: EvalRow[], today: string, avgOver = 5): TodayPlan {
  const dayIdx = dayNumber(today);
  const avgs = criterionAverages(rows, avgOver);
  const withData = CRITERIA.filter(c => avgs[c] !== null);

  if (!withData.length) {
    const c = CRITERIA[((dayIdx % 4) + 4) % 4];
    return {
      criterion: c,
      kind: pickKind(c, dayIdx),
      reason: 'Bạn chưa có bài chấm nào, hôm nay hãy khởi động với một dạng bài nền tảng.',
      basis: 'default',
    };
  }

  const errs = errorProfile(rows, avgOver);
  const weakest = [...withData].sort(
    (a, b) => (avgs[a]! - avgs[b]!) || (errs.byCriterion[b] - errs.byCriterion[a]) || CRITERIA.indexOf(a) - CRITERIA.indexOf(b),
  )[0];

  const top = topErrors(errs, 1)[0];
  const errNote = top && ERROR_TO_CRITERION[top.category] === weakest
    ? ` Lỗi hay gặp nhất: ${ERROR_LABEL[top.category].toLowerCase()} (${top.count} lần).`
    : '';
  return {
    criterion: weakest,
    kind: pickKind(weakest, dayIdx),
    reason: `Trung bình ${Math.min(rows.length, avgOver)} bài gần nhất, ${CRITERION_LABEL[weakest].short} của bạn thấp nhất (${avgs[weakest]!.toFixed(1)}).${errNote}`,
    basis: 'bands',
  };
}

function pickKind(c: Criterion, dayIdx: number): ExerciseKind {
  const kinds = CRITERION_TO_KINDS[c];
  return kinds[((dayIdx % kinds.length) + kinds.length) % kinds.length];
}
