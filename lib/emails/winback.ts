/**
 * Mẫu email win-back cho khách trả phí đã hết hạn (xem lib/winback.ts).
 * Cùng phong cách với renewal-reminder.ts: table + style inline, font Georgia dự phòng.
 * Nguyên tắc: không giảm giá, không hối thúc giả - nhắc lại tiến bộ có thật và hỏi lý do.
 */
import type { WinbackKind } from '../winback';

const SAPPHIRE = '#11183A';
const GOLD = '#C8A14B';
const PARCHMENT = '#F4ECD8';
const IVORY = '#FBF7EE';
const INK = '#241B10';

export interface WinbackEmailInput {
  kind: WinbackKind;
  fullName: string | null;
  expiredOn: string;        // dd/mm/yyyy
  progress: string;         // từ progressLine()
  pricingUrl: string;
  practiceUrl: string;
  unsubscribeUrl: string;
  canReply: boolean;        // có WINBACK_REPLY_TO thì mới mời trả lời
}

export function winbackSubject(i: WinbackEmailInput) {
  return i.kind === 'winback_3d'
    ? 'Bài viết của bạn vẫn còn nguyên trên WriteRight'
    : 'Bạn dừng luyện Writing vì sao? Cho chúng tôi biết với';
}

function paragraphs(i: WinbackEmailInput): string[] {
  if (i.kind === 'winback_3d') {
    return [
      `Gói WriteRight của bạn đã hết hạn ngày ${i.expiredOn}.`,
      i.progress,
      'Toàn bộ bài đã chấm vẫn còn nguyên. Gia hạn để mở lại điểm 4 tiêu chí, phần sửa lỗi trên bài và biểu đồ tiến bộ, rồi viết tiếp từ chỗ bạn đã dừng.',
      'Bạn vẫn được chấm miễn phí 1 bài mỗi tuần, kể cả khi không gia hạn.',
    ];
  }
  return [
    `Gói WriteRight của bạn đã hết hạn từ ngày ${i.expiredOn}. Đây là email cuối cùng chúng tôi gửi về việc này.`,
    i.progress,
    i.canReply
      ? 'Nếu bạn đã đạt band mục tiêu, xin chúc mừng! Nếu WriteRight chưa giúp được bạn như mong đợi, hãy trả lời email này một dòng thôi: điều gì làm bạn dừng lại? Chúng tôi đọc từng thư.'
      : 'Nếu bạn đã đạt band mục tiêu, xin chúc mừng! Còn nếu muốn luyện tiếp, gói của bạn có thể mở lại bất cứ lúc nào.',
  ];
}

export function winbackText(i: WinbackEmailInput) {
  const ten = i.fullName ? ` ${i.fullName}` : '';
  return [
    `Chào${ten},`, '',
    ...paragraphs(i).flatMap((p) => [p, '']),
    `Gia hạn: ${i.pricingUrl}`,
    `Viết bài miễn phí tuần này: ${i.practiceUrl}`, '',
    'Chúng tôi không tự động trừ tiền.', '',
    'UNICOACH · WriteRight',
    `Không muốn nhận email kiểu này nữa: ${i.unsubscribeUrl}`,
  ].join('\n');
}

export function winbackHtml(i: WinbackEmailInput) {
  const ten = i.fullName ? ` ${escapeHtml(i.fullName)}` : '';
  const ps = paragraphs(i).map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`).join('\n      ');
  const nutChinh = i.kind === 'winback_3d' ? 'Gia hạn và viết tiếp' : 'Mở lại gói của tôi';
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WriteRight</title></head>
<body style="margin:0;padding:0;background:${PARCHMENT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PARCHMENT};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${IVORY};border:1px solid #E3D7BC;border-radius:14px;overflow:hidden;">
    <tr><td style="background:${SAPPHIRE};padding:22px 28px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:.08em;color:${GOLD};">UNICOACH</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#E7CE8E;opacity:.75;margin-top:2px;">WriteRight</div>
    </td></tr>
    <tr><td style="padding:28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.65;color:${INK};">
      <p style="margin:0 0 16px;">Chào${ten},</p>
      ${ps}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 12px;">
        <tr><td style="background:${GOLD};border-radius:8px;">
          <a href="${i.pricingUrl}" style="display:inline-block;padding:13px 26px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${SAPPHIRE};text-decoration:none;font-weight:bold;">${nutChinh}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;font-size:14px;"><a href="${i.practiceUrl}" style="color:${SAPPHIRE};">Hoặc viết bài miễn phí tuần này</a></p>
      <p style="margin:12px 0 0;font-size:14px;color:#6B6250;">Chúng tôi không tự động trừ tiền.</p>
    </td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #E3D7BC;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8A8272;">
      Bạn nhận email này vì từng dùng gói trả phí của WriteRight.<br>
      <a href="${i.unsubscribeUrl}" style="color:#8A8272;">Không nhận email kiểu này nữa</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
