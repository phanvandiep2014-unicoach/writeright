// WriteRight từ đầu đến cuối trên Supabase cục bộ + Anthropic giả.
const { test, expect } = require('@playwright/test');
const { ssoLogin, admin, profileByCode, payosWebhook, submitEssay, daysFromNow } = require('./helpers');

const uniq = () => 'E2E' + Date.now().toString(36).toUpperCase();

test('SSO từ LMS: học viên mới được tạo tài khoản, có 1 lượt chấm miễn phí', async ({ page }) => {
  const code = uniq();
  await ssoLogin(page, { sub: code, name: 'Học viên E2E', email: `${code.toLowerCase()}@example.com`, writing_free: true, is_active_student: false });
  await expect(page).toHaveURL(/\/evaluate/);
  const p = await profileByCode(code);
  expect(p, 'phải có profile gắn mã học viên').toBeTruthy();
  expect(p.free_full_credits).toBe(1);
  expect(p.tier).toBe('free');
});

test('chấm bài: prompt A1, band tổng suy ra từ 4 tiêu chí, hiện căn cứ chấm, trừ lượt miễn phí', async ({ page }) => {
  const code = uniq();
  await ssoLogin(page, { sub: code, name: 'Học viên chấm', email: `${code.toLowerCase()}@example.com`, writing_free: true });
  const result = await submitEssay(page);
  // Anthropic giả khai overall 8.0 nhưng 4 tiêu chí đều 6.0 → server phải ghi đè.
  expect(result.overall_band).toBe(6);
  expect(result.prompt_version).toBe('a1');

  await expect(page.getByText('Task Achievement').first()).toBeVisible();
  await page.getByText(/Xem căn cứ chấm/).first().click();
  await expect(page.getByText('Căn cứ chấm').first()).toBeVisible();
  await expect(page.getByText(/Both views are discussed/)).toBeVisible();

  const p = await profileByCode(code);
  const { data: evs } = await admin().from('evaluations').select('overall_band, feedback').eq('user_id', p.id);
  expect(evs).toHaveLength(1);
  expect(Number(evs[0].overall_band)).toBe(6);
  expect(evs[0].feedback.prompt_version).toBe('a1');
  // Lượt miễn phí bị trừ bằng service role — vẫn chạy được sau khi khoá cột profiles.
  expect(p.free_full_credits).toBe(0);
  expect(p.free_full_until).toBeTruthy();
});

test('thanh toán: hạn tính từ bài chấm đầu tiên, tự bắt đầu sau 14 ngày', async ({ page, request }) => {
  const code = uniq();
  await ssoLogin(page, { sub: code, name: 'Khách trả tiền', email: `${code.toLowerCase()}@example.com` });
  const p0 = await profileByCode(code);
  const orderCode = Date.now();
  const { error } = await admin().from('orders').insert({ user_id: p0.id, order_code: orderCode, tier: 'standard', amount: 90000, status: 'pending', billing_cycle: 'monthly' });
  expect(error).toBeNull();

  // Chữ ký sai → 401, không đổi gì
  const bad = payosWebhook({ orderCode, amount: 90000, code: '00', description: 'WR' });
  bad.signature = 'sai';
  expect((await request.post('/api/payos-webhook', { data: bad })).status()).toBe(401);

  const r = await request.post('/api/payos-webhook', { data: payosWebhook({ orderCode, amount: 90000, code: '00', description: 'WR' }) });
  expect(r.status()).toBe(200);
  let p = await profileByCode(code);
  expect(p.tier).toBe('standard');
  expect(p.tier_pending_days).toBe(30);
  expect(daysFromNow(p.tier_expires_at)).toBeGreaterThan(43.9);
  expect(daysFromNow(p.tier_expires_at)).toBeLessThan(44.1);
  const { data: order } = await admin().from('orders').select('status').eq('order_code', orderCode).single();
  expect(order.status).toBe('paid');

  // Webhook gửi lại lần 2 → không cộng thêm ngày
  await request.post('/api/payos-webhook', { data: payosWebhook({ orderCode, amount: 90000, code: '00', description: 'WR' }) });
  expect((await profileByCode(code)).tier_expires_at).toBe(p.tier_expires_at);

  await page.goto('/dashboard');
  await expect(page.getByText(/30 ngày của gói bắt đầu tính từ bài chấm đầu tiên/)).toBeVisible();

  await submitEssay(page);
  p = await profileByCode(code);
  expect(p.tier_pending_days).toBeNull();
  expect(p.tier_activated_at).toBeTruthy();
  expect(daysFromNow(p.tier_expires_at)).toBeGreaterThan(29.9);
  expect(daysFromNow(p.tier_expires_at)).toBeLessThan(30.1);
});

test('học viên đang học (is_active_student): lên Standard, ngừng học thì về Free', async ({ page }) => {
  const code = uniq();
  const base = { sub: code, name: 'HV đang học', email: `${code.toLowerCase()}@example.com` };
  await ssoLogin(page, { ...base, is_active_student: true });
  let p = await profileByCode(code);
  expect(p.tier).toBe('standard');
  expect(p.enrolled_override).toBe(true);
  expect(p.tier_expires_at).toBeNull();

  await page.context().clearCookies();
  await ssoLogin(page, { ...base, is_active_student: false });
  p = await profileByCode(code);
  expect(p.tier).toBe('free');
  expect(p.enrolled_override).toBe(false);
});

test('bảo mật: học viên không tự nâng gói được từ trình duyệt', async ({ page }) => {
  const code = uniq();
  await ssoLogin(page, { sub: code, name: 'Thử nâng gói', email: `${code.toLowerCase()}@example.com` });
  // Dùng chính client Supabase trong trình duyệt (anon key + phiên của học viên) như kẻ xấu sẽ làm.
  const out = await page.evaluate(async ({ url, anon }) => {
    const cookie = document.cookie.split('; ').find(c => /^sb-.*-auth-token/.test(c));
    let raw = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
    if (raw.startsWith('base64-')) raw = atob(raw.slice(7).replace(/-/g, '+').replace(/_/g, '/'));
    const token = raw ? JSON.parse(raw).access_token : null;
    const uid = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub : null;
    const res = await fetch(`${url}/rest/v1/profiles?id=eq.${uid}`, {
      method: 'PATCH', headers: { apikey: anon, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ tier: 'premium', role: 'admin' }),
    });
    return { status: res.status, hasToken: !!token };
  }, { url: process.env.NEXT_PUBLIC_SUPABASE_URL, anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  expect(out.hasToken, 'phải đọc được phiên đăng nhập trong trình duyệt').toBe(true);
  expect(out.status).toBeGreaterThanOrEqual(400);
  const p = await profileByCode(code);
  expect(p.tier).toBe('free');
  expect(p.role).toBeNull();
});

test('chia sẻ kết quả từ dashboard: tạo link /e/… mở được', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const code = uniq();
  await ssoLogin(page, { sub: code, name: 'Người chia sẻ', email: `${code.toLowerCase()}@example.com`, writing_free: true });
  await submitEssay(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /Chia sẻ/ }).first().click();
  await expect(page.getByRole('button', { name: /Đã copy/ }).first()).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/e\/[0-9a-f-]{36}$/);
  const anon = await page.context().browser().newContext();
  const pub = await anon.newPage();
  await pub.goto(url);
  await expect(pub.getByText('6').first()).toBeVisible();
  await anon.close();
});
