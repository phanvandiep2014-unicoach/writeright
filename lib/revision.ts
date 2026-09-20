// Viết lại có hướng dẫn: sau khi chấm, học viên sửa lại chính bài của mình và bảng
// hướng dẫn tự tick từng lỗi đã được sửa. Không gọi AI, không tốn lượt chấm.
//
// Bộ chấm trả mỗi lỗi kèm `original` là đoạn trích NGUYÊN VĂN từ bài, nên "đã sửa"
// = đoạn đó không còn xuất hiện trong bản đang viết.

export interface RevisionError { original: string; corrected: string; category?: string; explanation?: unknown }

export interface RevisionItem<T extends RevisionError = RevisionError> {
  index: number;
  error: T;
  fixed: boolean;
}

export interface RevisionProgress<T extends RevisionError = RevisionError> {
  items: RevisionItem<T>[];
  fixed: number;
  total: number;
}

/** Gom mọi khoảng trắng về một dấu cách để xuống dòng / gõ thừa dấu cách không làm lệch so khớp. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export function revisionProgress<T extends RevisionError>(essay: string, errors: T[]): RevisionProgress<T> {
  const text = norm(essay);
  const items = errors
    .map((error, index) => ({ error, index }))
    .filter(x => norm(x.error.original || '').length > 0)
    .map(x => ({ ...x, fixed: !text.includes(norm(x.error.original)) }));
  return { items, fixed: items.filter(i => i.fixed).length, total: items.length };
}
