// Kiểm tra lib/weekly-plan.ts — chạy: npm run check:weekly
import assert from 'node:assert';
import { weekPlan, type WeekInput } from '../lib/weekly-plan';

const base: WeekInput = {
  today: '2026-10-07', essayDays: [], drillDays: [],
  essaysTarget: 2, drillTarget: 4, focus: 'gra', todayKind: 'grammar',
};

// 1. Đầu tuần, chưa làm gì → viết bài, kèm tiêu chí yếu.
let p = weekPlan(base);
assert.strictEqual(p.next.kind, 'essay');
assert.strictEqual(p.next.href, '/evaluate');
assert.ok(p.next.why.includes('Còn 2 bài'));
assert.ok(p.next.why.includes('Grammatical'));

// 2. Đã viết hôm nay, chưa làm bài tập → bài tập đúng dạng.
p = weekPlan({ ...base, essayDays: ['2026-10-07'] });
assert.strictEqual(p.next.kind, 'drill');
assert.strictEqual(p.next.href, '/practice/skills?kind=grammar');

// 3. Viết + luyện hôm nay, tuần còn thiếu → nghỉ, không dồn việc.
p = weekPlan({ ...base, essayDays: ['2026-10-07'], drillDays: ['2026-10-07', '2026-10-07'] });
assert.strictEqual(p.next.kind, 'done');
assert.strictEqual(p.next.href, null);
assert.strictEqual(p.drillDaysDone, 1, 'nhiều kết quả cùng ngày chỉ tính 1 ngày');

// 4. Đủ chỉ tiêu → "luyện thêm (tuỳ chọn)".
p = weekPlan({
  ...base,
  essayDays: ['2026-10-05', '2026-10-06'],
  drillDays: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'],
});
assert.strictEqual(p.next.kind, 'done');
assert.ok(p.next.href);

// 5. Đủ bài viết nhưng chưa luyện hôm nay → bài tập; không có tiêu chí yếu vẫn chạy.
p = weekPlan({ ...base, focus: null, essayDays: ['2026-10-05', '2026-10-06'] });
assert.strictEqual(p.next.kind, 'drill');

console.log('check-weekly-plan: OK');
