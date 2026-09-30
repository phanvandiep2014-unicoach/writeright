// @ts-nocheck — import đuôi .ts chỉ để Node chạy trực tiếp, tsc của Next không cần kiểm file này.
// Kiểm thử logic chọn email nurture + mẫu email. Chạy: node --experimental-strip-types scripts/test-nurture.ts
import assert from 'node:assert/strict';
import { pickNurture, withUtm, ictDate } from '../lib/nurture.ts';
import { nurtureHtml, nurtureSubject, nurtureText } from '../lib/emails/nurture.ts';

const DAY = 86_400_000;
const now = Date.parse('2026-10-10T03:00:00Z');
const base = { user_id: 'u1', email: 'a@b.co', full_name: 'Lan', tier: 'free', essays_count: 0,
  last_band: null, first_eval_at: null, last_eval_at: null };
const at = (daysAgo: number) => new Date(now - daysAgo * DAY - 1000).toISOString();
let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log('PASS', name); };

t('tuổi 0 ngày: chưa gửi gì', () => assert.equal(pickNurture({ ...base, signup_at: at(0) }, now), null));
t('tuổi 1 ngày, 0 bài -> d1', () => assert.equal(pickNurture({ ...base, signup_at: at(1) }, now)?.kind, 'nurture_d1'));
t('tuổi 2 ngày -> vẫn d1', () => assert.equal(pickNurture({ ...base, signup_at: at(2) }, now)?.kind, 'nurture_d1'));
t('tuổi 3 ngày -> d3', () => assert.equal(pickNurture({ ...base, signup_at: at(3) }, now)?.kind, 'nurture_d3'));
t('tuổi 6 ngày -> d3 (không dồn d1)', () => assert.equal(pickNurture({ ...base, signup_at: at(6) }, now)?.kind, 'nurture_d3'));
t('tuổi 7 ngày -> d7', () => assert.equal(pickNurture({ ...base, signup_at: at(7) }, now)?.kind, 'nurture_d7'));
t('tuổi 10 ngày -> hết chuỗi', () => assert.equal(pickNurture({ ...base, signup_at: at(10) }, now), null));
t('expires_on cố định theo ngày đăng ký (chống gửi trùng)', () => {
  const a = pickNurture({ ...base, signup_at: at(1.5) }, now)!, b = pickNurture({ ...base, signup_at: at(1.5) }, now + 3600_000)!;
  assert.equal(a.expiresOn, b.expiresOn);
});
const withEval = (firstAgo: number, lastAgo: number, band: number | string | null = 5.5) =>
  ({ ...base, signup_at: at(20), essays_count: '2', last_band: band, first_eval_at: at(firstAgo), last_eval_at: at(lastAgo) });
t('có bài, chưa đủ 24h -> chưa gửi', () => assert.equal(pickNurture(withEval(0.5, 0.5), now), null));
t('có bài ≥24h -> results', () => assert.equal(pickNurture(withEval(2, 1), now)?.kind, 'nurture_results'));
t('results: expires_on = ngày bài đầu tiên (chỉ một lần)', () =>
  assert.equal(pickNurture(withEval(2, 1), now)?.expiresOn, ictDate(now - 2 * DAY - 1000)));
t('bài cuối quá 14 ngày -> bỏ qua', () => assert.equal(pickNurture(withEval(30, 20), now), null));
t('thiếu band -> bỏ qua', () => assert.equal(pickNurture(withEval(2, 1, null), now), null));
t('essays_count dạng chuỗi "0" vẫn hiểu là 0', () =>
  assert.equal(pickNurture({ ...base, essays_count: '0', signup_at: at(1) }, now)?.kind, 'nurture_d1'));

t('UTM chuẩn', () => {
  const u = new URL(withUtm('https://unicoach.vn/', 'nurture_d1', 'hoalac_free_test_2026q4'));
  assert.equal(u.searchParams.get('utm_source'), 'writeright');
  assert.equal(u.searchParams.get('utm_medium'), 'email');
  assert.equal(u.searchParams.get('utm_content'), 'nurture_d1');
});

const common = { fullName: 'Lan <b>', practiceUrl: 'https://w/evaluate', ctaUrl: 'https://unicoach.vn/', unsubscribeUrl: 'https://w/api/unsubscribe?u=1&t=2&k=nurture' };
for (const kind of ['nurture_d1', 'nurture_d3', 'nurture_d7'] as const) {
  t(`${kind}: có link hủy và không lộ giá`, () => {
    const i = { ...common, kind }; const html = nurtureHtml(i), text = nurtureText(i);
    assert.ok(html.includes('k=nurture') && text.includes('k=nurture') && nurtureSubject(i).length > 5);
    assert.ok(!/\d+\s*(triệu|tr\b|đ\b|₫|vnđ)/i.test(html + text));
    assert.ok(!html.includes('<b>'), 'tên phải được escape');
  });
}
t('results theo khóa: nêu tên khóa + band + nhắc "chỉ tham khảo"', () => {
  const i = { ...common, kind: 'nurture_results' as const, band: 5.5, route: { route: 'course' as const, code: 'RANGER', label: 'Ranger (Hybrid 5.0–6.0)' } };
  const text = nurtureText(i);
  assert.ok(text.includes('Ranger') && text.includes('5.5') && text.includes('tham khảo'));
});
t('results tư vấn 1-1 khi ngoài dải', () => {
  const i = { ...common, kind: 'nurture_results' as const, band: 3.5, route: { route: 'consult' as const, code: 'CONSULT', label: 'Tư vấn 1-1' } };
  assert.ok(nurtureText(i).includes('1-1'));
});
console.log(`\n${n} kiểm tra đạt`);
