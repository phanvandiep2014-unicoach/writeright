'use client';
/**
 * Do dau phieu phia trinh duyet. Chi luu: ma an danh ngau nhien + UTM cham dau + ten mien gioi thieu.
 * Khong luu IP, noi dung bai viet hay thong tin ca nhan. Moi loi deu bi nuot de khong anh huong trang.
 */
const KEY = 'wr_ft';                 // first-touch
const TTL_MS = 30 * 86_400_000;

export interface FirstTouch {
  anon: string;
  ts: number;
  utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string;
  ref_host?: string;
}

function rid(): string {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

export function getFirstTouch(): FirstTouch | null {
  try {
    const raw = localStorage.getItem(KEY);
    let ft: FirstTouch | null = raw ? JSON.parse(raw) : null;
    const now = Date.now();
    const q = new URLSearchParams(location.search);
    const hasUtm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].some(k => q.get(k));
    // UTM cham dau: giu 30 ngay; chi ghi de khi het han (cham dau that su), nhung giu anon_id.
    if (!ft || now - ft.ts > TTL_MS) {
      let host = '';
      try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* bo qua */ }
      if (host === location.hostname) host = '';
      ft = {
        anon: ft?.anon || rid(), ts: now,
        utm_source: (q.get('utm_source') || '').slice(0, 60) || undefined,
        utm_medium: (q.get('utm_medium') || '').slice(0, 60) || undefined,
        utm_campaign: (q.get('utm_campaign') || '').slice(0, 80) || undefined,
        utm_content: (q.get('utm_content') || '').slice(0, 80) || undefined,
        ref_host: host.slice(0, 80) || undefined,
      };
      localStorage.setItem(KEY, JSON.stringify(ft));
    } else if (hasUtm && !ft.utm_source && !ft.utm_medium && !ft.utm_campaign) {
      // Lan dau co UTM sau mot lan vao truc tiep: bo sung (van coi la cham dau co nguon).
      ft = { ...ft, utm_source: (q.get('utm_source') || '').slice(0, 60) || undefined,
        utm_medium: (q.get('utm_medium') || '').slice(0, 60) || undefined,
        utm_campaign: (q.get('utm_campaign') || '').slice(0, 80) || undefined,
        utm_content: (q.get('utm_content') || '').slice(0, 80) || undefined };
      localStorage.setItem(KEY, JSON.stringify(ft));
    }
    // Cookie nho de may chu doc duoc khi khach dang ky (auth/callback).
    const small = encodeURIComponent(JSON.stringify({ a: ft.anon, s: ft.utm_source, m: ft.utm_medium, c: ft.utm_campaign, t: ft.utm_content, r: ft.ref_host }));
    if (small.length < 900) document.cookie = `${KEY}=${small}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax; Secure`;
    return ft;
  } catch { return null; }
}

export function track(event: string, path?: string) {
  try {
    const ft = getFirstTouch();
    if (!ft) return;
    const body = JSON.stringify({
      event, path: path || location.pathname, anon_id: ft.anon,
      utm_source: ft.utm_source, utm_medium: ft.utm_medium, utm_campaign: ft.utm_campaign,
      utm_content: ft.utm_content, ref_host: ft.ref_host,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* khong bao gio lam hong trang */ }
}
