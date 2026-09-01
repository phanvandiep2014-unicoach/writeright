/**
 * Mẫu email nhắc gia hạn.
 *
 * Cố ý dùng HTML table + style inline: Gmail/Outlook bỏ <style> trong <head>
 * và không tải web font. Prata/EB Garamond sẽ không hiện, nên fallback sang
 * Georgia — vẫn là chữ có chân, vẫn giữ được cảm giác của bộ nhận diện.
 */

const SAPPHIRE = '#11183A';
const GOLD = '#C8A14B';
const PARCHMENT = '#F4ECD8';
const IVORY = '#FBF7EE';
const INK = '#241B10';

export interface RenewalEmailInput {
  fullName: string | null;
  tier: string;
  /** Ngày hết hạn đã định dạng dd/mm/yyyy */
  expiresOn: string;
  daysLeft: number;
  pricingUrl: string;
}

function tierLabel(tier: string) {
  return tier === 'premium' ? 'Premium' : 'Standard';
}

export function renewalSubject({ daysLeft, expiresOn }: RenewalEmailInput) {
  return daysLeft <= 1
    ? `Gói WriteRight của bạn hết hạn ngày mai (${expiresOn})`
    : `Còn ${daysLeft} ngày nữa gói WriteRight của bạn hết hạn`;
}

export function renewalText(i: RenewalEmailInput) {
  const ten = i.fullName ? ` ${i.fullName}` : '';
  return [
    `Chào${ten},`,
    ``,
    i.daysLeft <= 1
      ? `Gói ${tierLabel(i.tier)} của bạn hết hạn vào ngày mai, ${i.expiresOn}.`
      : `Gói ${tierLabel(i.tier)} của bạn còn ${i.daysLeft} ngày, hết hạn ngày ${i.expiresOn}.`,
    ``,
    `Sau ngày đó, tài khoản trở về bản miễn phí: bạn vẫn xem được band tổng,`,
    `nhưng điểm 4 tiêu chí, phần sửa lỗi trên bài và biểu đồ tiến bộ sẽ tạm khoá.`,
    `Toàn bộ bài đã chấm vẫn còn nguyên, không mất đi đâu cả.`,
    ``,
    `Gia hạn tại: ${i.pricingUrl}`,
    ``,
    `Chúng tôi không tự động trừ tiền — gia hạn hay không là bạn quyết định.`,
    ``,
    `UNICOACH · WriteRight`,
  ].join('\n');
}

export function renewalHtml(i: RenewalEmailInput) {
  const ten = i.fullName ? ` ${escapeHtml(i.fullName)}` : '';
  const dong1 =
    i.daysLeft <= 1
      ? `Gói <strong>${tierLabel(i.tier)}</strong> của bạn hết hạn <strong>vào ngày mai, ${i.expiresOn}</strong>.`
      : `Gói <strong>${tierLabel(i.tier)}</strong> của bạn còn <strong>${i.daysLeft} ngày</strong>, hết hạn ngày <strong>${i.expiresOn}</strong>.`;

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nhắc gia hạn WriteRight</title></head>
<body style="margin:0;padding:0;background:${PARCHMENT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PARCHMENT};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${IVORY};border:1px solid #E3D7BC;border-radius:14px;overflow:hidden;">

    <tr><td style="background:${SAPPHIRE};padding:22px 28px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:.08em;color:${GOLD};">
        UNICOACH
      </div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#E7CE8E;opacity:.75;margin-top:2px;">
        WriteRight
      </div>
    </td></tr>

    <tr><td style="padding:28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.65;color:${INK};">
      <p style="margin:0 0 16px;">Chào${ten},</p>
      <p style="margin:0 0 16px;">${dong1}</p>
      <p style="margin:0 0 16px;">
        Sau ngày đó, tài khoản trở về bản miễn phí: bạn vẫn xem được band tổng,
        nhưng điểm 4 tiêu chí, phần sửa lỗi trên bài và biểu đồ tiến bộ sẽ tạm khoá.
        <strong>Toàn bộ bài đã chấm vẫn còn nguyên</strong>, không mất đi đâu cả.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="background:${GOLD};border-radius:8px;">
          <a href="${i.pricingUrl}"
             style="display:inline-block;padding:13px 26px;font-family:Georgia,'Times New Roman',serif;
                    font-size:15px;color:${SAPPHIRE};text-decoration:none;font-weight:bold;">
            Gia hạn ngay
          </a>
        </td></tr>
      </table>

      <p style="margin:0 0 8px;font-size:14px;color:#6B6250;">
        Chúng tôi không tự động trừ tiền — gia hạn hay không là bạn quyết định.
      </p>
    </td></tr>

    <tr><td style="padding:16px 28px 24px;border-top:1px solid #E3D7BC;
                   font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8A8272;">
      Bạn nhận email này vì đang dùng gói trả phí của WriteRight.<br>
      <a href="${i.pricingUrl}" style="color:#8A8272;">${i.pricingUrl}</a>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
