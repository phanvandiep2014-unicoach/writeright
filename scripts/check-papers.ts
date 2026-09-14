/**
 * Kiểm tra ngân hàng đề: mọi mã đề trong TEST_PAPERS phải trỏ tới đề có thật,
 * không được trùng, và phải phủ hết các dạng câu hỏi.
 *
 * Chạy: node_modules\.bin\sucrase-node.cmd scripts\check-papers.ts
 *
 * Đây là loại lỗi im lặng đắt nhất: một mã gõ sai chỉ nổ khi học viên đã ngồi
 * vào phòng thi. Chạy file này sau mỗi lần thêm đề.
 */
import assert from 'node:assert';
import { TEST_PAPERS, resolvePaper } from '../lib/writing-papers';
import { TASK1_BANK, TASK2_BANK } from '../lib/writing-tasks';

let bad = 0;
for (const p of TEST_PAPERS) {
  try { resolvePaper(p); }
  catch (e: any) { console.error(`  FAIL ${e.message}`); bad++; }
}
assert.strictEqual(bad, 0, `${bad} đề trỏ vào mã không tồn tại`);
console.log(`  ok   ${TEST_PAPERS.length} đề đều trỏ tới đề có thật`);

const ids = TEST_PAPERS.map(p => p.id);
assert.strictEqual(new Set(ids).size, ids.length, 'có mã đề bị trùng');
console.log('  ok   mã đề không trùng nhau');

const chartTypes = new Set(TEST_PAPERS.map(p => resolvePaper(p).task1.chartType));
for (const t of ['bar', 'line', 'pie', 'table', 'process', 'map']) {
  assert.ok(chartTypes.has(t as any), `chưa đề nào dùng dạng Task 1 "${t}"`);
}
console.log(`  ok   phủ đủ 6 dạng Task 1`);

const t2Types = new Set(TEST_PAPERS.map(p => resolvePaper(p).task2.type));
for (const t of ['opinion', 'discussion', 'problem-solution', 'adv-disadv', 'two-part']) {
  assert.ok(t2Types.has(t as any), `chưa đề nào dùng dạng Task 2 "${t}"`);
}
console.log('  ok   phủ đủ 5 dạng Task 2');

const usedT1 = new Set(TEST_PAPERS.map(p => p.task1Id));
const usedT2 = new Set(TEST_PAPERS.map(p => p.task2Id));
assert.strictEqual(usedT1.size, TEST_PAPERS.length, 'một đề Task 1 bị dùng ở hai paper');
assert.strictEqual(usedT2.size, TEST_PAPERS.length, 'một đề Task 2 bị dùng ở hai paper');
console.log('  ok   không paper nào dùng lại đề của paper khác');

console.log(`\nNgân hàng: ${TASK1_BANK.length} Task 1 · ${TASK2_BANK.length} Task 2 · ${TEST_PAPERS.length} đề ghép sẵn.`);
