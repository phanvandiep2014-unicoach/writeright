// Test trình duyệt WriteRight. Cần: Supabase cục bộ đã chạy + đã nạp supabase/schema-production.sql,
// và bản build Next (npm run build ở thư mục gốc) với biến môi trường trỏ vào Supabase đó.
// Xem job e2e trong .github/workflows/ci.yml.
const { defineConfig } = require('@playwright/test');

const PORT = 3100;
const ENV = {
  ...process.env,
  PORT: String(PORT),
  ANTHROPIC_API_KEY: 'fake-key',
  ANTHROPIC_BASE_URL: 'http://127.0.0.1:4010',
  UNICOACH_SSO_SECRET: process.env.UNICOACH_SSO_SECRET || 'e2e-sso-secret-0123456789',
  PAYOS_CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY || 'e2e-payos-checksum',
  NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
};
process.env.UNICOACH_SSO_SECRET = ENV.UNICOACH_SSO_SECRET;
process.env.PAYOS_CHECKSUM_KEY = ENV.PAYOS_CHECKSUM_KEY;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'vi-VN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: [
    { command: 'node fake-anthropic.js', url: 'http://127.0.0.1:4010', reuseExistingServer: false, env: ENV },
    { command: `npx next start -p ${PORT}`, cwd: '..', url: `http://127.0.0.1:${PORT}/login`, timeout: 120_000, reuseExistingServer: false, env: ENV },
  ],
});
