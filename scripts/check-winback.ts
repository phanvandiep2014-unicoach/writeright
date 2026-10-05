/**
 * Kiểm tra logic email win-back (lib/winback.ts).
 * Chạy: npm run check:winback
 */
import assert from 'node:assert';
import { pickWinback, progressLine, expiryKey } from '../lib/winback';

const NOW = Date.parse('2026-10-05T03:00:00.000Z');
const ago = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('  ok  ', name); };
const base = { user_id: 'u1', essays: 10 };

t('hết hạn 3 ngày, đã viết -> winback_3d', () => {
  assert.equal(pickWinback({ ...base, tier_expires_at: ago(3) }, NOW)?.kind, 'winback_3d');
});
t('hết hạn 8 ngày (lần chạy đầu bắt kịp) -> winback_3d', () => {
  assert.equal(pickWinback({ ...base, tier_expires_at: ago(8) }, NOW)?.kind, 'winback_3d');
});
t('hết hạn 11 ngày -> khoảng nghỉ, chưa gửi', () => {
  assert.equal(pickWinback({ ...base, tier_expires_at: ago(11) }, NOW), null);
});
t('hết hạn 1 ngày -> chưa gửi', () => {
  assert.equal(pickWinback({ ...base, tier_expires_at: ago(1) }, NOW), null);
});
t('còn hạn (đã gia hạn) -> không gửi', () => {
  assert.equal(pickWinback({ ...base, tier_expires_at: ago(-20) }, NOW), null);
});
t('0 bài -> không gửi (nhóm chưa bắt đầu xử lý riêng)', () => {
  assert.equal(pickWinback({ ...base, essays: 0, tier_expires_at: ago(3) }, NOW), null);
});
t('học viên đang học (enrolled_override) -> không gửi', () => {
  assert.equal(pickWinback({ ...base, enrolled_override: true, tier_expires_at: ago(3) }, NOW), null);
});
t('admin/giáo viên -> không gửi', () => {
  assert.equal(pickWinback({ ...base, role: 'admin', tier_expires_at: ago(3) }, NOW), null);
});
t('đã huỷ nhận email -> không gửi', () => {
  assert.equal(pickWinback({ ...base, optout: true, tier_expires_at: ago(3) }, NOW), null);
});
t('đã gửi 3d trong kỳ này -> không gửi lại', () => {
  assert.equal(pickWinback({ ...base, sent: ['winback_3d'], tier_expires_at: ago(4) }, NOW), null);
});
t('hết hạn 14 ngày -> winback_14d', () => {
  assert.equal(pickWinback({ ...base, sent: ['winback_3d'], tier_expires_at: ago(14) }, NOW)?.kind, 'winback_14d');
});
t('hết hạn 30 ngày -> thôi, không làm phiền', () => {
  assert.equal(pickWinback({ ...base, tier_expires_at: ago(30) }, NOW), null);
});
t('khoá kỳ theo giờ VN: 17:30 UTC 27/09 = 28/09 ở VN', () => {
  assert.equal(expiryKey('2026-09-27T17:30:00.000Z'), '2026-09-28');
});
t('dòng tiến bộ: tăng band', () => {
  assert.equal(progressLine(20, 5.0, 5.5), 'Bạn đã chấm 20 bài trên WriteRight, band đi từ 5.0 lên 5.5 (+0.5).');
});
t('dòng tiến bộ: không tăng -> chỉ nói band gần nhất, không bịa', () => {
  assert.equal(progressLine(7, 6.0, 5.5), 'Bạn đã chấm 7 bài trên WriteRight, bài gần nhất đạt band 5.5.');
});
t('dòng tiến bộ: 1 bài', () => {
  assert.equal(progressLine(1, 5.5, 5.5), 'Bạn đã chấm 1 bài trên WriteRight.');
});
console.log(`check-winback: ${n} kiểm tra đều qua`);
