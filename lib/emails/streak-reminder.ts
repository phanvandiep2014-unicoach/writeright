/** Email nhắc giữ chuỗi ngày luyện tập. Style inline như renewal-reminder (Gmail/Outlook bỏ <style>). */

const SAPPHIRE = '#11183A';
const GOLD = '#C8A14B';
const PARCHMENT = '#F4ECD8';
const IVORY = '#FBF7EE';
const INK = '#241B10';

export interface StreakEmailInput {
  fullName: string | null;
  streak: number;
  practiceUrl: string;
  unsubscribeUrl: string;
}

export function streakSubject({ streak }: StreakEmailInput) {
  return `Giữ chuỗi ${streak} ngày luyện viết của bạn — chỉ cần 5 phút hôm nay`;
}

export function streakText(i: StreakEmailInput) {
  const ten = i.fullName ? ` ${i.fullName}` : '';
  return [
    `Chào${ten},`,
    ``,
    `Bạn đã luyện ${i.streak} ngày liên tiếp — hôm nay bạn chưa luyện.`,
    `Chỉ cần một bài tập kỹ năng ngắn (khoảng 5 phút) là giữ được chuỗi.`,
    ``,
    `Luyện ngay: ${i.practiceUrl}`,
    ``,
    `UNICOACH · WriteRight`,
    ``,
    `Không muốn nhận email này nữa? Huỷ tại: ${i.unsubscribeUrl}`,
  ].join('\n');
}

export function streakHtml(i: StreakEmailInput) {
  const ten = i.fullName ? ` ${escapeHtml(i.fullName)}` : '';
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Giữ chuỗi luyện tập</title></head>
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
      <p style="margin:0 0 16px;">Bạn đã luyện <strong>${i.streak} ngày liên tiếp</strong> — hôm nay bạn chưa luyện.
        Chỉ cần một bài tập kỹ năng ngắn (khoảng 5 phút) là giữ được chuỗi.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="background:${GOLD};border-radius:8px;">
          <a href="${i.practiceUrl}" style="display:inline-block;padding:13px 26px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${SAPPHIRE};text-decoration:none;font-weight:bold;">Luyện ngay</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #E3D7BC;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8A8272;">
      Bạn nhận email này vì đang có chuỗi luyện tập trên WriteRight.
      <a href="${i.unsubscribeUrl}" style="color:#8A8272;">Huỷ nhận email nhắc luyện tập</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
