'use client';
import { useEffect, useState } from 'react';

/* ══════════════════════════════════════════════════════════════
   Nút chuyển sáng / tối.

   Ba trạng thái, bấm lần lượt: Tự động → Sáng → Tối → Tự động.
   • "Tự động" = bám theo hệ điều hành (prefers-color-scheme),
     không ghi gì vào <html>, để CSS media query tự lo.
   • Sáng / Tối = đặt data-theme trên <html> và nhớ trong localStorage.

   Script chống nháy nằm trong app/layout.tsx và chạy TRƯỚC khi
   React dựng cây — nếu đặt ở đây thì trang sẽ loé trắng một nhịp.
   ══════════════════════════════════════════════════════════════ */

const KEY = 'wr-theme';
type Mode = 'system' | 'light' | 'dark';

const LABEL: Record<Mode, string> = {
  system: 'Giao diện: theo hệ thống',
  light: 'Giao diện: sáng',
  dark: 'Giao diện: tối',
};

function apply(mode: Mode) {
  const el = document.documentElement;
  if (mode === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', mode);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: Mode = 'system';
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark') saved = v;
    } catch { /* trình duyệt chặn storage — cứ để tự động */ }
    setMode(saved);
    setReady(true);
  }, []);

  const cycle = () => {
    const next: Mode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
    apply(next);
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch { /* bỏ qua */ }
  };

  // Trước khi biết lựa chọn đã lưu thì giữ chỗ, tránh nhấp nháy sai biểu tượng.
  if (!ready) return <span className="theme-toggle" aria-hidden="true" style={{ visibility: 'hidden' }} />;

  return (
    <button type="button" onClick={cycle} className="theme-toggle" title={LABEL[mode]} aria-label={LABEL[mode]}>
      {mode === 'system' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2.5" y="4" width="19" height="13" rx="2" />
          <path d="M8.5 20.5h7M12 17v3.5" />
        </svg>
      )}
      {mode === 'light' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
        </svg>
      )}
      {mode === 'dark' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z" />
        </svg>
      )}
    </button>
  );
}
