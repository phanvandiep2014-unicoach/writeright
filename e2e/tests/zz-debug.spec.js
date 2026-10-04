const { test, expect } = require('@playwright/test');
const { ssoToken } = require('./helpers');
test('DEBUG cookie sau SSO', async ({ page }) => {
  const hops = [];
  page.on('response', r => { if (r.status() >= 300 && r.status() < 400) hops.push(`${r.status()} ${new URL(r.url()).pathname} -> ${r.headers()['location'] || ''} | set-cookie: ${(r.headers()['set-cookie'] || '').slice(0, 300)}`); });
  await page.goto('/sso?token=' + encodeURIComponent(ssoToken({ sub: 'DBG' + Date.now(), name: 'Dbg', email: `dbg${Date.now()}@example.com` })));
  await page.waitForLoadState('networkidle');
  const cookies = (await page.context().cookies()).map(c => `${c.name} dom=${c.domain} sec=${c.secure} http=${c.httpOnly} len=${c.value.length}`);
  let fetchRes = '';
  try { fetchRes = await page.evaluate(async (u) => { const r = await fetch(u + '/rest/v1/', { headers: { apikey: 'x' } }); return 'status ' + r.status; }, process.env.NEXT_PUBLIC_SUPABASE_URL); } catch (e) { fetchRes = 'ERR ' + e.message; }
  expect({ url: page.url(), supa: process.env.NEXT_PUBLIC_SUPABASE_URL, hops, cookies, fetchRes }).toEqual('xem-annotation');
});
