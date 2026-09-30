// @ts-nocheck — import đuôi .ts chỉ để Node chạy trực tiếp.
// Chạy: node --experimental-strip-types scripts/test-onboarding.ts
import assert from 'node:assert/strict';
import { pickOnboarding } from '../lib/onboarding.ts';
import { nurtureHtml, nurtureSubject, nurtureText } from '../lib/emails/nurture.ts';

const DAY = 86_400_000;
const now = Date.parse('2026-10-10T03:00:00Z');
const base = { user_id: 'u1', email: 'a@b.co', full_name: 'Lan', tier: 'standard',
  tier_expires_at: '2026-11-05T00:00:00Z', expires_on: '2026-11-05', a_sent_at: null };
let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS', name); };

t('chưa gửi a -> a', () => assert.equal(pickOnboarding(base, now)?.kind, 'onboard_paid_a'));
t('expires_on = ngày hết hạn gói (mỗi kỳ gói một lần)', () => assert.equal(pickOnboarding(base, now)?.expiresOn, '2026-11-05'));
t('đã gửi a 1 ngày trước -> chưa gửi gì', () => assert.equal(pickOnboarding({ ...base, a_sent_at: new Date(now - DAY).toISOString() }, now), null));
t('đã gửi a 3.9 ngày trước -> chưa', () => assert.equal(pickOnboarding({ ...base, a_sent_at: new Date(now - 3.9 * DAY).toISOString() }, now), null));
t('đã gửi a 4 ngày trước -> b', () => assert.equal(pickOnboarding({ ...base, a_sent_at: new Date(now - 4 * DAY).toISOString() }, now)?.kind, 'onboard_paid_b'));
t('đã gửi a 14 ngày trước -> thôi', () => assert.equal(pickOnboarding({ ...base, a_sent_at: new Date(now - 14 * DAY).toISOString() }, now), null));
t('thiếu expires_on -> không gửi', () => assert.equal(pickOnboarding({ ...base, expires_on: '' }, now), null));

const input = (kind) => ({ kind, fullName: 'Lan <b>', practiceUrl: 'https://w.example/evaluate?x=1', ctaUrl: 'https://u.example/',
  unsubscribeUrl: 'https://w.example/unsub' });
for (const k of ['onboard_paid_a', 'onboard_paid_b']) {
  t(`${k}: đủ chủ đề/HTML/text, có link hủy, escape tên`, () => {
    const i = input(k);
    assert.ok(nurtureSubject(i).length > 10);
    assert.ok(nurtureHtml(i).includes('https://w.example/unsub'));
    assert.ok(nurtureHtml(i).includes('Lan &lt;b&gt;'));
    assert.ok(nurtureText(i).includes('gói trả phí'));
  });
  t(`${k}: không niêm yết giá, không cam kết band`, () => {
    const s = nurtureText(input(k)).toLowerCase();
    assert.ok(!/(vnđ|vnd|giảm giá|cam kết|đảm bảo|\d\s?(đ|k|triệu)(\s|$))/.test(s));
  });
}
t('email nurture thường vẫn ghi chú đồng ý', () => assert.ok(nurtureText(input('nurture_d1')).includes('đã đồng ý')));
console.log(`\n${n} bài kiểm tra đạt`);
