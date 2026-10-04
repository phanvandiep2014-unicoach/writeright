/**
 * Kiểm tra cổng SSO từ UNICOACH LMS: verifyLmsToken() + lmsEmailFor().
 *
 * Chạy: npm run check:sso
 *
 * Token ở đây được ký ĐÚNG như LMS ký (jsonwebtoken HS256, xem
 * unicoach-bms/server/routes/integrations.js). Bên LMS có test đối xứng
 * (test-sso.js) khẳng định token thật mang iss/aud/sub và 3 cờ. Hai test cùng
 * xanh nghĩa là hai bên vẫn khớp hợp đồng.
 */
import assert from 'node:assert';
import crypto from 'node:crypto';
import { verifyLmsToken, lmsEmailFor, LmsSsoPayload } from '../lib/unicoach';
import { verifyLmsRequest } from '../lib/lms-server-auth';

const SECRET = 'sso-test-secret-0123456789abcdef';
const b64 = (v: string | Buffer) => Buffer.from(v).toString('base64url');

function signLike(payload: Record<string, unknown>, opts: { secret?: string; alg?: string } = {}) {
  const h = b64(JSON.stringify({ alg: opts.alg ?? 'HS256', typ: 'JWT' }));
  const p = b64(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', opts.secret ?? SECRET).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64(sig)}`;
}

const now = Math.floor(Date.now() / 1000);
const good = {
  iss: 'unicoach-lms', aud: 'writeright', sub: 'HV001', lms_student_id: 7,
  name: 'Lan', email: 'lan@x.co', skill: 'writing',
  writing_free: true, speaking_free: true, is_active_student: true,
  iat: now, exp: now + 300,
};

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('  ok  ', name); };
const rejects = (token: string, msg: RegExp) => assert.throws(() => verifyLmsToken(token, SECRET), msg);

t('token hợp lệ: giữ nguyên sub và 3 cờ', () => {
  const p = verifyLmsToken(signLike(good), SECRET);
  assert.equal(p.sub, 'HV001');
  assert.equal(p.writing_free, true);
  assert.equal(p.speaking_free, true);
  assert.equal(p.is_active_student, true);
});
t('is_active_student=false đi qua nguyên vẹn (khác với thiếu trường)', () => {
  assert.equal(verifyLmsToken(signLike({ ...good, is_active_student: false }), SECRET).is_active_student, false);
  const { is_active_student, ...old } = good;
  assert.equal(verifyLmsToken(signLike(old), SECRET).is_active_student, undefined);
});
t('token thi thử mang mock_session/minutes/callback vẫn hợp lệ', () => {
  const p = verifyLmsToken(signLike({ ...good, mock_session: 'm1', minutes: 60, callback: 'https://lms/x' }), SECRET);
  assert.equal(p.mock_session, 'm1');
});
t('sai khóa → từ chối', () => rejects(signLike(good, { secret: 'khac' }), /Chữ ký/));
t('alg=none hoặc HS512 → từ chối', () => {
  rejects(signLike(good, { alg: 'none' }), /Thuật toán/);
  rejects(signLike(good, { alg: 'HS512' }), /Thuật toán/);
});
t('sửa payload sau khi ký → từ chối', () => {
  const [h, , s] = signLike(good).split('.');
  rejects(`${h}.${b64(JSON.stringify({ ...good, sub: 'HV999' }))}.${s}`, /Chữ ký/);
});
t('hết hạn → từ chối', () => rejects(signLike({ ...good, exp: now - 1 }), /hết hạn/));
t('sai iss / aud (token của Precisely) / thiếu sub → từ chối', () => {
  rejects(signLike({ ...good, iss: 'khac' }), /không do UNICOACH/);
  rejects(signLike({ ...good, aud: 'precisely' }), /không dành cho WriteRight/);
  rejects(signLike({ ...good, sub: '' }), /thiếu mã học viên/);
});
t('rác / thiếu phần → từ chối', () => {
  rejects('abc', /định dạng/);
  rejects('', /định dạng/);
});
t('email: dùng email thật nếu hợp lệ, không thì email nội bộ theo mã HV', () => {
  assert.equal(lmsEmailFor({ ...good, email: ' Lan@X.co ' } as LmsSsoPayload), 'lan@x.co');
  assert.equal(lmsEmailFor({ ...good, email: undefined } as LmsSsoPayload), 'hv001@lms.unicoach.vn');
  assert.equal(lmsEmailFor({ ...good, email: 'khong-phai-email' } as LmsSsoPayload), 'hv001@lms.unicoach.vn');
});

// ── Lệnh máy-chủ-tới-máy-chủ từ LMS (bài thi thử 4 kỹ năng → /api/external/mock-*) ──
// LMS ký y như dưới đây (unicoach-bms/server/ielts-writing.js → wrPost).
const lmsReq = (body: string, o: { secret?: string; ts?: number } = {}) => {
  const ts = o.ts ?? Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', o.secret ?? SECRET).update(`${ts}.${body}`).digest('hex');
  return new Request('https://wr.test/api/external/mock-paper', { method: 'POST', body,
    headers: { 'x-unicoach-timestamp': String(ts), 'x-unicoach-signature': sig } });
};
const body = JSON.stringify({ paper: 'P06' });
process.env.UNICOACH_SSO_SECRET = SECRET;
t('lệnh LMS ký đúng → chấp nhận', () => assert.equal(verifyLmsRequest(lmsReq(body), body), null));
t('lệnh LMS sai khóa / bị sửa body / quá 10 phút → từ chối', () => {
  assert.match(String(verifyLmsRequest(lmsReq(body, { secret: 'khac' }), body)), /Chữ ký/);
  assert.match(String(verifyLmsRequest(lmsReq(body), JSON.stringify({ paper: 'P07' }))), /Chữ ký/);
  assert.match(String(verifyLmsRequest(lmsReq(body, { ts: Math.floor(Date.now() / 1000) - 601 }), body)), /quá hạn/);
});
t('chưa cấu hình UNICOACH_SSO_SECRET → từ chối, không cho qua', () => {
  delete process.env.UNICOACH_SSO_SECRET;
  assert.match(String(verifyLmsRequest(lmsReq(body), body)), /UNICOACH_SSO_SECRET/);
});

console.log(`\nSSO: ${n} kiểm tra đạt.`);
