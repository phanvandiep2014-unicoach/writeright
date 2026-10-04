/**
 * Địa chỉ API Anthropic. Mặc định là API thật; test e2e đặt ANTHROPIC_BASE_URL trỏ sang
 * máy chủ giả (e2e/fake-anthropic.js) để chấm bài không tốn tiền và cho kết quả cố định.
 */
export const ANTHROPIC_MESSAGES_URL =
  (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '') + '/v1/messages';
