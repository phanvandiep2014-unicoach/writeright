const crypto = require('crypto');
const { expect } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

const b64 = v => Buffer.from(v).toString('base64url');

/** Ký token SSO y như LMS (jsonwebtoken HS256) — xem unicoach-bms/server/routes/integrations.js. */
function ssoToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64(JSON.stringify({ iss: 'unicoach-lms', aud: 'writeright', iat: now, exp: now + 300, ...payload }));
  const s = crypto.createHmac('sha256', process.env.UNICOACH_SSO_SECRET).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64(s)}`;
}

/** Đăng nhập bằng đúng luồng thật: LMS → /sso?token → magic link → /auth/confirm → /evaluate. */
async function ssoLogin(page, payload) {
  await page.goto('/sso?token=' + encodeURIComponent(ssoToken(payload)));
  await page.waitForURL(/\/(evaluate|mock)/, { timeout: 30_000 });
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

async function profileByCode(code) {
  const { data, error } = await admin().from('profiles').select('*').eq('lms_student_code', code).maybeSingle();
  if (error) throw error;
  return data;
}

/** Ký webhook PayOS y như PayOS (lib/payos.ts → verifyWebhookSignature). */
function payosWebhook(data) {
  const raw = Object.keys(data).sort().map(k => `${k}=${data[k] ?? ''}`).join('&');
  return { code: '00', desc: 'success', success: true, data, signature: crypto.createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY).update(raw).digest('hex') };
}

const ESSAY = `Some people believe that universities should focus on practical skills, while others think academic knowledge matters more. This essay discusses both views before giving my opinion.
On the one hand, practical skills help graduates find jobs quickly. Employers often complain that young people is not ready for work, and a lot of companies spend money on training. Courses such as accounting or engineering already include internships, which prepare students for real tasks.
On the other hand, academic knowledge develops critical thinking. Students who study theory can adapt when technology changes, because they understand principles rather than procedures. Moreover, research at universities creates new industries that practical training alone could never produce.
In conclusion, although practical skills are useful, I believe universities should keep a strong academic focus, because thinking skills last longer than any single technique.`;
const PROMPT = 'Some people think universities should focus on practical skills for work, others believe academic knowledge is more important. Discuss both views and give your opinion.';

/** Chấm một bài qua giao diện thật, chờ có kết quả. */
async function submitEssay(page) {
  await page.goto('/evaluate');
  await page.getByPlaceholder(/Dán đề bài IELTS Writing/).fill(PROMPT);
  await page.getByPlaceholder(/Dán hoặc nhập bài luận/).fill(ESSAY);
  const resp = page.waitForResponse(r => r.url().endsWith('/api/evaluate') && r.request().method() === 'POST', { timeout: 60_000 });
  await page.getByRole('button', { name: /Chấm bài ngay/ }).click();
  const r = await resp;
  expect(r.status(), await r.text().catch(() => '')).toBe(200);
  return r.json();
}

const DAY = 86_400_000;
const daysFromNow = iso => (Date.parse(iso) - Date.now()) / DAY;

module.exports = { ssoToken, ssoLogin, admin, profileByCode, payosWebhook, submitEssay, daysFromNow, ESSAY };
