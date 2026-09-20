// "My mistakes" drill — biến chính các lỗi học viên đã mắc (feedback.error_corrections)
// thành câu hỏi chọn đúng/sai. Không gọi AI, không tốn lượt chấm, không bịa đáp án nhiễu:
// hai lựa chọn là đúng câu chữ học viên đã viết và bản sửa của bộ chấm.

import type { EvalRow } from './practice-insights';

export interface MistakeQuestion {
  id: string;
  category: string;
  /** Hai lựa chọn đã xáo; `answer` là chỉ số của bản đã sửa. */
  options: [string, string];
  answer: 0 | 1;
  explanation: string;
}

/** Lời giải thích của bộ chấm là chuỗi hoặc {en, vi}; drill này hiển thị tiếng Anh. */
export function explanationText(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object') {
    const o = x as { en?: unknown; vi?: unknown };
    if (typeof o.en === 'string' && o.en.trim()) return o.en;
    if (typeof o.vi === 'string') return o.vi;
  }
  return '';
}

const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');

/**
 * Lấy tối đa `limit` câu từ các bài chấm gần nhất (mới → cũ). Bỏ lỗi thiếu dữ liệu,
 * bản sửa trùng bản gốc (chỉ khác hoa/thường vẫn giữ vì đó là lỗi thật), đoạn quá dài
 * và trùng lặp giữa các bài.
 */
export function buildMistakeQuestions(rows: EvalRow[], rand: () => number = Math.random, limit = 8): MistakeQuestion[] {
  const seen = new Set<string>();
  const items: { id: string; category: string; o: string; c: string; explanation: string }[] = [];
  rows.forEach((r, ri) => {
    if (!Array.isArray(r.error_corrections)) return;
    r.error_corrections.forEach((e, ei) => {
      const o = clean(e?.original), c = clean(e?.corrected);
      if (!o || !c || o === c || o.length > 160 || c.length > 160) return;
      const key = (o + '\u0000' + c).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ id: `m${ri}-${ei}`, category: e.category || 'grammar', o, c, explanation: explanationText(e.explanation) });
    });
  });
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, limit).map(it => {
    const fixedFirst = rand() < 0.5;
    return {
      id: it.id, category: it.category, explanation: it.explanation,
      options: fixedFirst ? [it.c, it.o] : [it.o, it.c],
      answer: (fixedFirst ? 0 : 1) as 0 | 1,
    };
  });
}
