/**
 * Kiểm tra phần Luyện tập: danh mục đề và bài tập kỹ năng.
 *
 * Chạy: npm run check:practice
 *
 * Lỗi im lặng đắt nhất ở đây là hai chỗ: (1) đáp án trỏ sai ô, học viên làm
 * đúng mà bị báo sai; (2) văn bản đề luyện tập lệch so với cái được lưu vào
 * evaluations.task_prompt, khiến đề "đã làm" không bao giờ được đánh dấu.
 */
import assert from 'node:assert';
import { SKILL_EXERCISES, KIND_META, CRITERION_LABEL, withShuffledOptions } from '../lib/skill-exercises';
import { PRACTICE_ITEMS, summariseAttempts, applyFilter, DEFAULT_FILTER, suggestNext, findPracticeItem } from '../lib/practice';
import { TASK1_BANK, TASK2_BANK } from '../lib/writing-tasks';

// ── Bài tập kỹ năng ──
const exIds = SKILL_EXERCISES.map(e => e.id);
assert.strictEqual(new Set(exIds).size, exIds.length, 'có mã bài tập bị trùng');
for (const e of SKILL_EXERCISES) {
  assert.strictEqual(e.options.length, 4, `${e.id}: cần đúng 4 lựa chọn`);
  assert.ok(Number.isInteger(e.answer) && e.answer >= 0 && e.answer < e.options.length, `${e.id}: chỉ số đáp án ngoài phạm vi`);
  assert.strictEqual(new Set(e.options).size, e.options.length, `${e.id}: có lựa chọn trùng nhau`);
  assert.ok(e.explanation.trim().length > 20, `${e.id}: thiếu lời giải thích`);
  assert.ok(e.criterion in CRITERION_LABEL, `${e.id}: tiêu chí không hợp lệ`);
  assert.ok(e.kind in KIND_META, `${e.id}: dạng bài không hợp lệ`);
}
console.log(`  ok   ${SKILL_EXERCISES.length} bài tập kỹ năng hợp lệ`);

// Xáo lựa chọn: đáp án đúng phải vẫn là đúng câu chữ đó, với mọi thứ tự xáo.
let seed = 42;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const positions = [0, 0, 0, 0];
for (const e of SKILL_EXERCISES) {
  for (let n = 0; n < 50; n++) {
    const sh = withShuffledOptions(e, rand);
    assert.strictEqual(sh.options[sh.answer], e.options[e.answer], `${e.id}: xáo làm lệch đáp án`);
    assert.deepStrictEqual([...sh.options].sort(), [...e.options].sort(), `${e.id}: xáo làm mất lựa chọn`);
    positions[sh.answer]++;
  }
}
const total = positions.reduce((a, b) => a + b, 0);
assert.ok(positions.every(c => c > total * 0.15), `đáp án không rải đều sau khi xáo: ${positions.join('/')}`);
console.log(`  ok   xáo lựa chọn giữ đúng đáp án, rải A/B/C/D = ${positions.join('/')}`);

for (const k of Object.keys(KIND_META)) {
  assert.ok(SKILL_EXERCISES.some(e => e.kind === k), `chưa có bài nào cho dạng "${k}"`);
}
console.log('  ok   mỗi dạng bài đều có nội dung');

// ── Danh mục đề ──
assert.strictEqual(PRACTICE_ITEMS.length, TASK1_BANK.length + TASK2_BANK.length, 'thiếu/thừa đề so với ngân hàng gốc');
const pIds = PRACTICE_ITEMS.map(p => p.id);
assert.strictEqual(new Set(pIds).size, pIds.length, 'có mã đề luyện tập bị trùng');
const texts = PRACTICE_ITEMS.map(p => p.promptText.trim());
assert.strictEqual(new Set(texts).size, texts.length, 'hai đề có cùng văn bản — sẽ bị nhận nhầm là đã làm');
console.log(`  ok   ${PRACTICE_ITEMS.length} đề luyện tập, mã và văn bản không trùng`);

assert.strictEqual(findPracticeItem('khong-ton-tai'), null);
assert.strictEqual(findPracticeItem(null), null);
assert.strictEqual(findPracticeItem(pIds[0])?.id, pIds[0]);
console.log('  ok   tra đề theo mã');

// ── Nhận diện đề đã làm ──
const t2 = PRACTICE_ITEMS.find(p => p.task === 2)!;
const t1 = PRACTICE_ITEMS.find(p => p.task === 1)!;
const summary = summariseAttempts([
  { task_prompt: t2.promptText, overall_band: 6.0, created_at: '2026-09-01T00:00:00Z' },
  { task_prompt: `  ${t2.promptText}  `, overall_band: 7.0, created_at: '2026-09-05T00:00:00Z' },
  { task_prompt: t1.promptText, overall_band: null, created_at: '2026-09-02T00:00:00Z' },
  { task_prompt: 'một đề học viên tự dán', overall_band: 8, created_at: '2026-09-03T00:00:00Z' },
  { task_prompt: null, overall_band: 5, created_at: '2026-09-04T00:00:00Z' },
]);
assert.strictEqual(Object.keys(summary).length, 2, 'chỉ đề trong ngân hàng mới được tính');
assert.strictEqual(summary[t2.id].count, 2);
assert.strictEqual(summary[t2.id].best, 7);
assert.strictEqual(summary[t2.id].last, '2026-09-05T00:00:00Z');
assert.strictEqual(summary[t1.id].best, null);
console.log('  ok   nhận diện đề đã làm, điểm cao nhất, số lần làm');

// ── Bộ lọc & gợi ý ──
assert.strictEqual(applyFilter(PRACTICE_ITEMS, DEFAULT_FILTER, {}).length, PRACTICE_ITEMS.length);
assert.ok(applyFilter(PRACTICE_ITEMS, { ...DEFAULT_FILTER, task: 1 }, {}).every(p => p.task === 1));
assert.strictEqual(applyFilter(PRACTICE_ITEMS, { ...DEFAULT_FILTER, status: 'done' }, summary).length, 2);
assert.strictEqual(applyFilter(PRACTICE_ITEMS, { ...DEFAULT_FILTER, status: 'todo' }, summary).length, PRACTICE_ITEMS.length - 2);
assert.strictEqual(applyFilter(PRACTICE_ITEMS, { ...DEFAULT_FILTER, query: 'zzzz-khong-co' }, {}).length, 0);
const nxt = suggestNext(summary);
assert.ok(nxt && !summary[nxt.id], 'đề gợi ý không được là đề đã làm');
console.log('  ok   bộ lọc và gợi ý đề');

console.log('\nPractice: mọi kiểm tra đạt.');
