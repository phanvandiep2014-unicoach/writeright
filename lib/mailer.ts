import nodemailer from 'nodemailer';

/**
 * SMTP mailer — gửi qua hộp thư tên miền sẵn có (maychuemail).
 *
 * Biến môi trường cần đặt trên Vercel (Settings → Environment Variables):
 *   SMTP_HOST   ví dụ mail.maychuemail.com
 *   SMTP_PORT   465 (SSL) hoặc 587 (STARTTLS)
 *   SMTP_USER   địa chỉ hộp thư đầy đủ, ví dụ no-reply@unicoach.vn
 *   SMTP_PASS   mật khẩu hộp thư đó
 *   MAIL_FROM   'UNICOACH <no-reply@unicoach.vn>'  (tuỳ chọn, mặc định = SMTP_USER)
 *
 * LƯU Ý DELIVERABILITY: tên miền unicoach.vn phải có ĐÚNG MỘT bản ghi SPF
 * ở host @. Hai bản SPF làm bên nhận trả PERMERROR, và _dmarc đang đặt
 * p=reject nên thư sẽ bị chặn thẳng chứ không vào spam.
 */

type Transporter = ReturnType<typeof nodemailer.createTransport>;
let cached: Transporter | null = null;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} chua duoc dat trong bien moi truong`);
  return v;
}

export function getTransport(): Transporter {
  if (cached) return cached;

  const port = Number(process.env.SMTP_PORT || 465);

  cached = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    // 465 = TLS ngầm định; 587 = kết nối thường rồi nâng cấp STARTTLS.
    secure: port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });

  return cached;
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export async function sendMail({ to, subject, html, text, headers }: SendMailParams) {
  const from = process.env.MAIL_FROM || `UNICOACH <${env('SMTP_USER')}>`;
  return getTransport().sendMail({ from, to, subject, html, text, headers });
}
