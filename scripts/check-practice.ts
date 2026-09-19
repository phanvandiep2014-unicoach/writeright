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
import {
  ictDay, computeStreak, activityDays, criterionAverages, errorProfile, topErrors,
  bandTrend, exerciseAccuracy, recommendToday, EvalRow,
} from '../lib/practice-insights';

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

// ── Giai đoạn 2: chuỗi ngày, hồ sơ lỗi, gợi ý hôm nay ──
assert.strictEqual(ictDay('2026-09-18T18:00:00Z'), '2026-09-19', '18:00 UTC đã là sáng hôm sau ở Việt Nam');
assert.strictEqual(ictDay('2026-09-18T16:59:00Z'), '2026-09-18');
console.log('  ok   ngày tính theo giờ Việt Nam (UTC+7)');

const T = '2026-09-19';
assert.deepStrictEqual(computeStreak([], T), { current: 0, longest: 0, activeToday: false });
assert.deepStrictEqual(computeStreak(['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-19'], T), { current: 1, longest: 3, activeToday: true });
assert.deepStrictEqual(computeStreak(['2026-09-16', '2026-09-17', '2026-09-18'], T), { current: 3, longest: 3, activeToday: false });
assert.strictEqual(computeStreak(['2026-09-15', '2026-09-16'], T).current, 0, 'bỏ trọn một ngày thì đứt chuỗi');
assert.strictEqual(computeStreak(['2026-09-18', '2026-09-18', '2026-09-19'], T).current, 2, 'nhiều hoạt động trong ngày chỉ tính một');
const days = activityDays(
  [{ created_at: '2026-09-18T20:00:00Z' }],              // = 19/09 giờ VN
  [{ created_at: '2026-09-18T05:00:00Z' }],              // = 18/09 giờ VN
);
assert.deepStrictEqual(Array.from(days).sort(), ['2026-09-18', '2026-09-19']);
console.log('  ok   chuỗi ngày: giữ chuỗi trong ngày, đứt khi bỏ trọn ngày, gộp bài chấm + bài tập');

const ev = (o: Partial<EvalRow>): EvalRow => ({
  created_at: '2026-09-10T00:00:00Z', overall_band: 6, ta_band: 6, cc_band: 6, lr_band: 6, gra_band: 6, ...o,
});
const rows: EvalRow[] = [
  ev({ created_at: '2026-09-18T00:00:00Z', overall_band: 6.5, ta_band: 7, cc_band: 6.5, lr_band: 6.5, gra_band: 5.5,
       error_corrections: [{ category: 'grammar' }, { category: 'grammar' }, { category: 'vocabulary' }, { category: 'lạ-hoắc' }] }),
  ev({ created_at: '2026-09-12T00:00:00Z', overall_band: 6, ta_band: 6.5, cc_band: 6, lr_band: 6, gra_band: 5.5,
       error_corrections: [{ category: 'reference' }] }),
  ev({ created_at: '2026-09-05T00:00:00Z', overall_band: null, ta_band: null, cc_band: null, lr_band: null, gra_band: null, error_corrections: null }),
];
const avgs = criterionAverages(rows);
assert.strictEqual(avgs.gra, 5.5);
assert.strictEqual(avgs.ta, 6.75, 'bài không có điểm không kéo trung bình về 0');
assert.strictEqual(criterionAverages([]).ta, null);

const prof = errorProfile(rows);
assert.strictEqual(prof.evalsCounted, 2, 'bài không có dữ liệu lỗi bị bỏ qua, không tính là 0 lỗi');
assert.strictEqual(prof.counts.grammar, 3, 'loại lỗi lạ được quy về grammar như trang /evaluate');
assert.strictEqual(prof.byCriterion.gra, 3);
assert.strictEqual(prof.byCriterion.cc, 1);
assert.strictEqual(topErrors(prof, 1)[0].category, 'grammar');
console.log('  ok   trung bình tiêu chí và hồ sơ lỗi');

assert.deepStrictEqual(bandTrend(rows).map(p => p.band), [6, 6.5], 'xu hướng cũ → mới, bỏ bài không có điểm');
const acc = exerciseAccuracy([
  { created_at: '', kind: 'grammar', criterion: 'gra', correct: true },
  { created_at: '', kind: 'grammar', criterion: 'gra', correct: false },
  { created_at: '', kind: 'x', criterion: 'không-có', correct: true },
]);
assert.deepStrictEqual(acc.gra, { ok: 1, total: 2 });
console.log('  ok   xu hướng band và độ chính xác bài tập');

const plan = recommendToday(rows, T);
assert.strictEqual(plan.criterion, 'gra');
assert.strictEqual(plan.kind, 'grammar');
assert.strictEqual(plan.basis, 'bands');
assert.ok(plan.reason.includes('5.5') && /grammar/i.test(plan.reason), 'lý do phải nêu điểm và loại lỗi hay gặp');
assert.deepStrictEqual(recommendToday(rows, T), plan, 'cùng ngày, cùng dữ liệu → cùng gợi ý');
const tie = recommendToday([ev({ ta_band: 6, cc_band: 6, lr_band: 6, gra_band: 6, error_corrections: [{ category: 'reference' }, { category: 'reference' }] })], T);
assert.strictEqual(tie.criterion, 'cc', 'hoà điểm thì chọn tiêu chí nhiều lỗi hơn');
const fresh = recommendToday([], T);
assert.strictEqual(fresh.basis, 'default');
const seen = new Set(['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22'].map(d => recommendToday([], d).criterion));
assert.strictEqual(seen.size, 4, 'học viên mới được xoay vòng đủ 4 tiêu chí');
console.log('  ok   gợi ý bài tập hôm nay: ổn định, có lý do, xử lý hoà điểm và học viên mới');

console.log('\nPractice: mọi kiểm tra đạt.');
