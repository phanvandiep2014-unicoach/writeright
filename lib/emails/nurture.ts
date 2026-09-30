/** Email nurture theo hành vi. Style inline như streak-reminder (Gmail/Outlook bỏ <style>).
 *  Không niêm yết học phí, không cam kết kết quả, không gọi tính năng chưa có. */
import type { NurtureKind } from '../nurture';
import type { OnboardKind } from '../onboarding';

export type EmailKind = NurtureKind | OnboardKind;
const isOnboard = (k: EmailKind) => k.startsWith('onboard_');
const footerNote = (k: EmailKind) => isOnboard(k)
  ? 'Bạn nhận email này vì đang dùng gói trả phí WriteRight.'
  : 'Bạn nhận email này vì đã đồng ý nhận email hướng dẫn học tập và tư vấn từ UNICOACH.';

const SAPPHIRE = '#11183A';
const GOLD = '#C8A14B';
const PARCHMENT = '#F4ECD8';
const IVORY = '#FBF7EE';
const INK = '#241B10';

export interface BandRoute { route: 'course' | 'consult'; code: string; label: string }

export interface NurtureEmailInput {
  kind: EmailKind;
  fullName: string | null;
  practiceUrl: string;     // đã gắn UTM
  ctaUrl: string;          // trang tư vấn/đặt lịch của UNICOACH, đã gắn UTM
  unsubscribeUrl: string;
  band?: number | null;
  route?: BandRoute | null;
}

interface Body { subject: string; paras: string[]; cta: { label: string; url: string } }

function body(i: NurtureEmailInput): Body {
  switch (i.kind) {
    case 'onboard_paid_a':
      return {
        subject: 'Gói WriteRight của bạn đã sẵn sàng — chấm bài đầu tiên trong vài phút',
        paras: [
          'Cảm ơn bạn đã đăng ký gói WriteRight. Bạn chưa nộp bài nào, nên đây là cách bắt đầu nhanh nhất.',
          'Chọn Task 1 hoặc Task 2, dán bài viết của bạn (bài nháp hay bài cũ đều được) rồi bấm chấm. WriteRight trả về band ước tính theo bốn tiêu chí, chỉ ra lỗi cần sửa trước và cho bạn viết lại để so sánh. Kết quả do AI chấm nên chỉ mang tính tham khảo.',
        ],
        cta: { label: 'Chấm bài đầu tiên', url: i.practiceUrl },
      };
    case 'onboard_paid_b':
      return {
        subject: 'Bạn chưa chấm bài nào — cần UNICOACH hỗ trợ không?',
        paras: [
          'Gói của bạn vẫn đang chạy nhưng chưa có bài nào được chấm. Nếu bạn chưa biết bắt đầu từ đâu hoặc chưa rõ nên viết đề nào, mentor của UNICOACH có thể hướng dẫn bạn một buổi ngắn để dùng WriteRight đúng cách.',
          'Hoặc bạn có thể tự bắt đầu ngay bằng bất kỳ bài viết nào có sẵn.',
        ],
        cta: { label: 'Nhờ mentor hướng dẫn', url: i.ctaUrl },
      };
    case 'nurture_d1':
      return {
        subject: 'Bài Writing đầu tiên của bạn đang chờ được chấm',
        paras: [
          'Bạn đã tạo tài khoản WriteRight nhưng chưa nộp bài nào.',
          'Chỉ cần dán một bài viết (Task 1 hoặc Task 2), WriteRight sẽ chấm theo bốn tiêu chí của IELTS Writing và chỉ ra chỗ cần sửa trước tiên. Bài nháp cũng chấm được.',
        ],
        cta: { label: 'Chấm bài đầu tiên', url: i.practiceUrl },
      };
    case 'nurture_d3':
      return {
        subject: 'Chưa biết bắt đầu từ đâu? Chọn một đề bạn đã làm gần đây',
        paras: [
          'Nhiều bạn chần chừ vì nghĩ bài mình chưa đủ tốt để nộp. Thực tế là bài viết còn nhiều lỗi mới là bài cho bạn nhiều thông tin nhất.',
          'Hãy lấy một bài bạn đã viết ở lớp hoặc tự luyện và dán vào WriteRight. Mất khoảng vài phút.',
        ],
        cta: { label: 'Dán bài và nhận nhận xét', url: i.practiceUrl },
      };
    case 'nurture_d7':
      return {
        subject: 'Email cuối về WriteRight — bạn cần giúp gì không?',
        paras: [
          'Đây là email nhắc cuối cùng của chúng tôi về việc thử WriteRight.',
          'Nếu bạn muốn có người hướng dẫn trực tiếp thay vì tự luyện, mentor của UNICOACH có thể trao đổi để hiểu mục tiêu và trình độ hiện tại của bạn.',
        ],
        cta: { label: 'Trao đổi với mentor UNICOACH', url: i.ctaUrl },
      };
    case 'nurture_results': {
      const band = i.band != null ? i.band.toFixed(1) : '';
      const head = `Bài viết gần nhất của bạn được WriteRight ước tính khoảng band ${band}. Đây là kết quả do AI chấm, chỉ mang tính tham khảo.`;
      const r = i.route;
      if (r && r.route === 'course') {
        return {
          subject: 'Kết quả bài viết của bạn và bước tiếp theo',
          paras: [
            head,
            `Ở mức này, khóa phù hợp để bạn tìm hiểu là ${r.label} — khóa Hybrid có giáo viên hướng dẫn trực tiếp. Mentor sẽ xác nhận lại trình độ của bạn trước khi tư vấn lộ trình.`,
          ],
          cta: { label: 'Tìm hiểu lộ trình và đặt lịch tư vấn', url: i.ctaUrl },
        };
      }
      return {
        subject: 'Kết quả bài viết của bạn và bước tiếp theo',
        paras: [
          head,
          `Ở mức này, một buổi tư vấn 1-1 với mentor sẽ giúp bạn chọn lộ trình sát với mục tiêu hơn là một khóa có sẵn.`,
        ],
        cta: { label: 'Đặt lịch tư vấn 1-1', url: i.ctaUrl },
      };
    }
  }
}

export function nurtureSubject(i: NurtureEmailInput) { return body(i).subject; }

export function nurtureText(i: NurtureEmailInput) {
  const b = body(i);
  const ten = i.fullName ? ` ${i.fullName}` : '';
  return [
    `Chào${ten},`, '', ...b.paras.flatMap(p => [p, '']),
    `${b.cta.label}: ${b.cta.url}`, '',
    'UNICOACH · WriteRight', '',
    footerNote(i.kind),
    `Không muốn nhận nữa? Hủy tại: ${i.unsubscribeUrl}`,
  ].join('\n');
}

export function nurtureHtml(i: NurtureEmailInput) {
  const b = body(i);
  const ten = i.fullName ? ` ${escapeHtml(i.fullName)}` : '';
  const paras = b.paras.map(p => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`).join('\n      ');
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
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
      ${paras}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="background:${GOLD};border-radius:8px;">
          <a href="${b.cta.url}" style="display:inline-block;padding:13px 26px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${SAPPHIRE};text-decoration:none;font-weight:bold;">${escapeHtml(b.cta.label)}</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #E3D7BC;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8A8272;">
      ${footerNote(i.kind)}
      <a href="${i.unsubscribeUrl}" style="color:#8A8272;">Hủy nhận email này</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
