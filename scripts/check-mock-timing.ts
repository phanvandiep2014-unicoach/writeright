/**
 * Kiểm tra bộ luật quản lý thời gian bằng những lượt thi dựng sẵn.
 *
 * Chạy:  node_modules\.bin\sucrase-node.cmd scripts\check-mock-timing.ts
 *        (macOS/Linux: node_modules/.bin/sucrase-node scripts/check-mock-timing.ts)
 *
 * Không dùng test runner để khỏi thêm phụ thuộc: đây là mã thuần, `assert` của
 * Node là đủ. Mục đích là mỗi lần sửa ngưỡng trong lib/mock-timing.ts thì biết
 * ngay mình có làm câm một cảnh báo nào không.
 */
import assert from 'node:assert';
import { analyseTiming, weightedWritingBand, TaskTiming, TimingSample } from '../lib/mock-timing';

let passed = 0;
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok   ${name}`); }
  catch (e: any) { console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1; }
}

/** Dựng chuỗi mẫu tăng đều: viết `words` từ trong khoảng [from, to] giây. */
function ramp(from: number, to: number, words: number, step = 20): TimingSample[] {
  const out: TimingSample[] = [];
  for (let t = from; t <= to; t += step) {
    out.push({ t, words: Math.round((words * (t - from)) / Math.max(1, to - from)) });
  }
  return out;
}

function task(task: 1 | 2, o: Partial<TaskTiming> = {}): TaskTiming {
  const allotted = task === 1 ? 1200 : 2400;
  return {
    task, allottedSec: allotted, usedSec: allotted, autoSubmitted: false,
    firstKeystrokeSec: 150, lastKeystrokeSec: allotted - 180,
    wordCount: task === 1 ? 180 : 280, samples: [], pasteCount: 0, ...o,
  };
}

const codes = (a: ReturnType<typeof analyseTiming>) => a.findings.map(f => f.code);

console.log('mock-timing');

check('bài mẫu chuẩn không sinh cảnh báo nghiêm trọng', () => {
  const t1 = task(1, { samples: ramp(150, 1020, 180) });
  const t2 = task(2, { samples: ramp(150, 2220, 280) });
  const a = analyseTiming([t1, t2], true);
  assert.deepStrictEqual(a.findings.filter(f => f.severity === 'critical'), [], 'không được có mục "phải sửa"');
  assert.ok(codes(a).includes('GOOD_REVIEW'), 'phải khen việc rà bài');
  assert.ok(a.score >= 80, `điểm phải cao, đang là ${a.score}`);
});

check('thiếu số từ bị bắt và gắn vào Task Achievement', () => {
  const a = analyseTiming([task(2, { wordCount: 190, samples: ramp(150, 2220, 190) })], false);
  const f = a.findings.find(x => x.code === 'UNDER_LENGTH');
  assert.ok(f, 'phải có UNDER_LENGTH');
  assert.strictEqual(f!.severity, 'critical');
  assert.strictEqual(f!.criterion, 'TA');
});

check('nộp ngay sau chữ cuối bị nhắc, và nhắc đúng tiêu chí GRA', () => {
  const a = analyseTiming([task(2, { lastKeystrokeSec: 2395, usedSec: 2400, samples: ramp(150, 2395, 280) })], false);
  const f = a.findings.find(x => x.code === 'NO_REVIEW');
  assert.ok(f, 'phải có NO_REVIEW');
  assert.strictEqual(f!.criterion, 'GRA');
  assert.ok(!codes(a).includes('GOOD_REVIEW'), 'không được vừa khen vừa chê');
});

check('viết ngay không lập dàn ý bị bắt', () => {
  const a = analyseTiming([task(2, { firstKeystrokeSec: 20, samples: ramp(20, 2220, 280) })], false);
  assert.ok(codes(a).includes('NO_PLANNING'));
});

check('lập dàn ý quá lâu bị bắt', () => {
  const a = analyseTiming([task(2, { firstKeystrokeSec: 700, samples: ramp(700, 2220, 280) })], false);
  assert.ok(codes(a).includes('OVER_PLANNING'));
  assert.ok(!codes(a).includes('NO_PLANNING'), 'hai cảnh báo này loại trừ nhau');
});

check('đứng hình giữa bài được phát hiện', () => {
  // Viết 120 từ trong 6 phút đầu, đứng im ~5 phút, rồi viết nốt.
  const tail = ramp(820, 2220, 155);
  const samples: TimingSample[] = [
    ...ramp(150, 510, 120),
    { t: 600, words: 122 }, { t: 700, words: 124 }, { t: 800, words: 125 },
    ...tail.map(s => ({ t: s.t, words: 125 + s.words })),
  ];
  const a = analyseTiming([task(2, { samples })], false);
  assert.ok(codes(a).includes('STALL'), `phải có STALL, đang có ${codes(a).join(',')}`);
});

check('nộp sớm khi bài còn thiếu là lỗi nghiêm trọng riêng', () => {
  const a = analyseTiming([task(2, { usedSec: 1200, lastKeystrokeSec: 1100, wordCount: 150, samples: ramp(150, 1100, 150) })], false);
  assert.ok(codes(a).includes('EARLY_SHORT'));
  assert.ok(codes(a).includes('UNDER_LENGTH'));
});

check('dồn thời gian cho Task 1 khiến Task 2 hỏng — chỉ báo khi thi đủ hai phần', () => {
  const t1 = task(1, { usedSec: 1200, wordCount: 260, samples: ramp(150, 1020, 260) });
  const t2 = task(2, { autoSubmitted: true, wordCount: 210, samples: ramp(150, 2400, 210) });
  const full = analyseTiming([t1, t2], true);
  assert.ok(codes(full).includes('T1_OVERINVEST'), 'thi đủ hai phần thì phải báo');
  assert.ok(codes(full).includes('T1_TOO_LONG'), 'Task 1 dài quá cũng phải báo');
  const solo = analyseTiming([t1, t2], false);
  assert.ok(!codes(solo).includes('T1_OVERINVEST'), 'luyện lẻ thì không được suy diễn chuyện phân bổ');
});

check('hết giờ khi vẫn đủ chữ không bị tính là thiếu chữ', () => {
  const a = analyseTiming([task(2, { autoSubmitted: true, wordCount: 285, samples: ramp(150, 2400, 285) })], false);
  assert.ok(codes(a).includes('AUTO_SUBMIT'));
  assert.ok(!codes(a).includes('UNDER_LENGTH'));
  assert.ok(!codes(a).includes('NO_REVIEW'), 'hết giờ thì không trách chuyện không rà bài');
});

check('thanh thời gian không bao giờ có đoạn âm', () => {
  // Số liệu rác: phím cuối muộn hơn cả lúc nộp.
  const a = analyseTiming([task(2, { usedSec: 600, firstKeystrokeSec: 900, lastKeystrokeSec: 1500 })], false);
  for (const p of a.paces) {
    assert.ok(p.planningSec >= 0 && p.writingSec >= 0 && p.reviewSec >= 0, 'mọi đoạn phải >= 0');
    assert.ok(p.planningSec + p.writingSec + p.reviewSec <= 601, 'tổng không được vượt thời gian đã dùng');
  }
});

console.log('\nweightedWritingBand');
check('Task 2 nặng gấp đôi', () => {
  assert.strictEqual(weightedWritingBand(6.0, 7.0), 6.5);   // (6 + 14)/3 = 6.67 -> 6.5
  assert.strictEqual(weightedWritingBand(7.0, 6.0), 6.5);   // (7 + 12)/3 = 6.33 -> 6.5
  assert.strictEqual(weightedWritingBand(5.0, 6.5), 6.0);   // (5 + 13)/3 = 6.0
  assert.strictEqual(weightedWritingBand(8.0, 8.0), 8.0);
});
check('thiếu một phần thì trả về phần còn lại, không tự bịa', () => {
  assert.strictEqual(weightedWritingBand(null, 6.5), 6.5);
  assert.strictEqual(weightedWritingBand(6.5, null), 6.5);
  assert.strictEqual(weightedWritingBand(null, null), null);
});

console.log(`\n${passed} phép kiểm tra đã qua.`);
