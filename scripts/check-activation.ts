/**
 * Kiểm tra hạn dùng tính từ bài chấm đầu tiên (lib/activation.ts).
 * Chạy: npm run check:activation
 */
import assert from 'node:assert';
import { paymentPatch, activationPatch, autoStartDate, DAY_MS } from '../lib/activation';

const T0 = Date.parse('2026-10-05T03:00:00.000Z');
const at = (d: number) => new Date(T0 + d * DAY_MS).toISOString();
const days = (iso: string) => Math.round((Date.parse(iso) - T0) / DAY_MS * 1000) / 1000;
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('  ok  ', name); };

t('mua mới gói tháng: hạn tạm = 14 + 30 ngày, chờ 30 ngày', () => {
  const p = paymentPatch(null, 30, T0);
  assert.equal(days(p.tier_expires_at), 44);
  assert.equal(p.tier_pending_days, 30);
});
t('mua mới gói năm: 14 + 365, chờ 365', () => {
  const p = paymentPatch({ tier_expires_at: null, tier_pending_days: null }, 365, T0);
  assert.equal(days(p.tier_expires_at), 379);
  assert.equal(p.tier_pending_days, 365);
});
t('chấm bài đầu tiên ngày thứ 3: hạn = ngày 3 + 30', () => {
  const p = paymentPatch(null, 30, T0);
  const a = activationPatch(p, T0 + 3 * DAY_MS)!;
  assert.equal(days(a.tier_expires_at), 33);
  assert.equal(a.tier_pending_days, null);
  assert.equal(a.tier_activated_at, at(3));
});
t('chấm ngay sau khi trả tiền: đúng 30 ngày', () => {
  const a = activationPatch(paymentPatch(null, 30, T0), T0)!;
  assert.equal(days(a.tier_expires_at), 30);
});
t('không chấm bài nào: tự bắt đầu ngày 14 → hết hạn ngày 44 (không cần làm gì)', () => {
  const p = paymentPatch(null, 30, T0);
  assert.equal(autoStartDate(p)!.toISOString(), at(14));
  assert.equal(days(p.tier_expires_at), 44);
});
t('chấm lần đầu ngày 20 (đã quá 14 ngày): không kéo dài thêm, giữ ngày 44', () => {
  const a = activationPatch(paymentPatch(null, 30, T0), T0 + 20 * DAY_MS)!;
  assert.equal(days(a.tier_expires_at), 44);
  assert.equal(a.tier_pending_days, null);
});
t('bài chấm thứ hai: không đổi gì', () => {
  const a = activationPatch(paymentPatch(null, 30, T0), T0 + 3 * DAY_MS)!;
  assert.equal(activationPatch(a, T0 + 5 * DAY_MS), null);
});
t('khách cũ (không có kỳ chờ): bài chấm không đổi hạn', () => {
  assert.equal(activationPatch({ tier_expires_at: at(10), tier_pending_days: null }, T0), null);
  assert.equal(activationPatch(null, T0), null);
});
t('gia hạn khi còn hạn và đã kích hoạt: cộng dồn, không chờ', () => {
  const p = paymentPatch({ tier_expires_at: at(5), tier_pending_days: null }, 30, T0);
  assert.equal(days(p.tier_expires_at), 35);
  assert.equal(p.tier_pending_days, null);
});
t('mua thêm khi kỳ trước còn đang chờ: cộng cả hạn tạm lẫn số ngày chờ', () => {
  const p1 = paymentPatch(null, 30, T0);                         // hạn 44, chờ 30
  const p2 = paymentPatch(p1, 30, T0 + 2 * DAY_MS);               // hạn 74, chờ 60
  assert.equal(days(p2.tier_expires_at), 74);
  assert.equal(p2.tier_pending_days, 60);
  const a = activationPatch(p2, T0 + 4 * DAY_MS)!;                // chấm ngày 4 → 64
  assert.equal(days(a.tier_expires_at), 64);
});
t('mua lại sau khi đã hết hạn: bắt đầu kỳ chờ mới', () => {
  const p = paymentPatch({ tier_expires_at: at(-3), tier_pending_days: null }, 30, T0);
  assert.equal(days(p.tier_expires_at), 44);
  assert.equal(p.tier_pending_days, 30);
  assert.equal(p.tier_activated_at, null);
});
t('kỳ chờ đã chạy hết hạn mà chưa chấm: bài chấm sau đó không hồi sinh gói', () => {
  assert.equal(activationPatch({ tier_expires_at: at(-1), tier_pending_days: 30 }, T0), null);
});

console.log(`\nKích hoạt hạn dùng: ${n} kiểm tra đạt.`);
