import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';

/**
 * Form liên hệ đối tác AaaS (trung tâm / giáo viên / trường) từ trang /centers.
 * - Đẩy lead về LMS (/api/v1/leads) với nguồn writeright_b2b để theo dõi ở "Phễu & lịch đặt".
 * - Gửi thêm email báo về cs@unicoach.vn (mang đủ thông tin đơn vị, vì LMS không lưu mọi trường của form).
 * - Thành công khi ít nhất một trong hai đường chạy được; cả hai hỏng thì trả 502 để form hiện email liên hệ.
 * Ô đồng ý trên form KHÔNG tick sẵn; thiếu đồng ý thì từ chối.
 */
export const dynamic = 'force-dynamic';

const NOTIFY_TO = process.env.CENTERS_NOTIFY_EMAIL || 'cs@unicoach.vn';
const TYPES: Record<string, string> = {
  center: 'Trung tâm ngoại ngữ',
  teacher: 'Giáo viên / gia sư',
  school: 'Trường học / tổ chức giáo dục',
  tech: 'Đơn vị công nghệ / có LMS riêng',
  other: 'Khác',
};
const VOLUMES = new Set(['<100', '100-500', '500-2000', '>2000', 'unknown']);

// Chống spam nhẹ theo IP (best-effort: mỗi instance serverless có bộ nhớ riêng).
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 3_600_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) hits.clear();
  return arr.length > 5;
}

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export async function POST(req: Request) {
  let b: any = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }

  // Honeypot: người thật không thấy ô này; bot điền vào thì giả vờ thành công.
  if (s(b.website, 200)) return NextResponse.json({ ok: true });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return NextResponse.json({ error: 'too_many' }, { status: 429 });

  const name = s(b.name, 100);
  const org = s(b.org, 150);
  const email = s(b.email, 200).toLowerCase();
  const phone = s(b.phone, 30);
  const type = TYPES[s(b.type, 20)] ? s(b.type, 20) : 'other';
  const volume = VOLUMES.has(s(b.volume, 20)) ? s(b.volume, 20) : 'unknown';
  const message = s(b.message, 1500);
  const ft = b.ft && typeof b.ft === 'object' ? b.ft : {};

  if (!name || !org) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: 'consent_required' }, { status: 400 });

  const note = [
    `Đơn vị: ${org} (${TYPES[type]})`,
    `Quy mô dự kiến: ${volume} bài/tháng`,
    message ? `Lời nhắn: ${message}` : '',
  ].filter(Boolean).join('\n');

  // 1) Lead về LMS
  let lms: 'sent' | 'skipped' | 'failed' = 'skipped';
  const key = process.env.LMS_LEADS_API_KEY;
  if (key) {
    const base = (process.env.LMS_BASE_URL || 'https://lms.unicoach.vn').replace(/\/$/, '');
    const utm = {
      utm_source: 'writeright_b2b',
      utm_medium: 'centers_page',
      utm_campaign: 'aaas_pilot',
      utm_content: s(ft.utm_source, 60) || undefined,
    };
    try {
      const r = await fetch(base + '/api/v1/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({
          name, email, phone: phone || undefined,
          source: 'writeright_b2b',
          interest: 'WriteRight AaaS (B2B)',
          note,
          utm,
          landing_site: 'writeright',
          consent: true,
          consent_source: 'writeright_centers',
        }),
        signal: AbortSignal.timeout(8000),
      });
      lms = r.ok ? 'sent' : 'failed';
    } catch { lms = 'failed'; }
  }

  // 2) Email báo về business
  let mail: 'sent' | 'failed' = 'failed';
  try {
    const rows: [string, string][] = [
      ['Họ tên', name], ['Đơn vị', org], ['Loại đơn vị', TYPES[type]], ['Email', email],
      ['SĐT / Zalo', phone || '—'], ['Quy mô (bài/tháng)', volume], ['Lời nhắn', message || '—'],
      ['Lead vào LMS', lms],
    ];
    await sendMail({
      to: NOTIFY_TO,
      subject: `[AaaS] Liên hệ mới: ${org}`,
      replyTo: email,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `<table cellpadding="6" style="font-family:sans-serif;font-size:14px">${rows
        .map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`,
    });
    mail = 'sent';
  } catch { /* nuốt lỗi: còn đường LMS */ }

  if (lms !== 'sent' && mail !== 'sent') {
    return NextResponse.json({ error: 'delivery_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
