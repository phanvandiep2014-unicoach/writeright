/**
 * Nhận học viên từ UNICOACH LMS.
 *   LMS mở: https://writeright.unicoach.vn/sso?token=<JWT>
 * Token do LMS ký bằng khóa SSO riêng của app (Quản trị → Ứng dụng liên kết → Khóa SSO),
 * HS256, hết hạn 5 phút, dùng một lần để đăng nhập — KHÔNG dùng làm session.
 */
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { verifyLmsToken, lmsEmailFor } from '@/lib/unicoach';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';   // cần node:crypto

function fail(origin: string, msg: string) {
  const url = new URL('/login', origin);
  url.searchParams.set('error', 'sso');
  url.searchParams.set('msg', msg.slice(0, 200));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');
  const secret = process.env.UNICOACH_SSO_SECRET;

  if (!token) return fail(origin, 'Thiếu token. Hãy mở WriteRight từ trong LMS.');
  if (!secret) return fail(origin, 'WriteRight chưa cấu hình khóa SSO. Liên hệ quản trị viên.');

  let payload;
  try { payload = verifyLmsToken(token, secret); }
  catch (e: any) { return fail(origin, e?.message || 'Token không hợp lệ.'); }

  const email = lmsEmailFor(payload);
  const admin = createAdminSupabase();

  try {
    // Tìm tài khoản theo email. Supabase chưa có API tra cứu trực tiếp theo email
    // nên duyệt danh sách; số học viên ở quy mô trung tâm nên còn nhẹ.
    let userId: string | undefined;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      userId = data.users.find(u => (u.email || '').toLowerCase() === email)?.id;
      if (data.users.length < 200) break;
    }

    const meta = {
      lms_student_code: payload.sub,
      lms_student_id: payload.lms_student_id ?? null,
      full_name: payload.name || undefined,
    };

    if (userId) {
      // Cập nhật mã học viên phòng khi trước đó bạn ấy tự đăng nhập bằng Google
      await admin.auth.admin.updateUserById(userId, { user_metadata: meta });
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email, email_confirm: true, user_metadata: meta,
      });
      if (error) throw error;
      userId = data.user?.id;
    }
    if (!userId) return fail(origin, 'Không tạo được tài khoản học viên.');

    // Lượt chấm đầy đủ miễn phí do LMS cấp (C3).
    // Chỉ cấp MỘT lần: BMS còn giữ cờ true cho tới khi điểm bài thật được đẩy
    // về, nên học viên mở WriteRight nhiều lần trước đó vẫn mang cờ. Điều kiện
    // `free_full_granted_at is null` chặn việc cấp lại.
    // Cột chỉ có sau khi chạy sql/lms-free-credit.sql — chưa chạy thì lỗi này
    // không được phép chặn đăng nhập, nên chỉ ghi log.
    if (payload.writing_free === true) {
      const { error: creditErr } = await admin
        .from('profiles')
        .update({ free_full_credits: 1, free_full_granted_at: new Date().toISOString() })
        .eq('id', userId)
        .is('free_full_granted_at', null);
      if (creditErr) console.error('[sso] không cấp được lượt miễn phí:', creditErr.message);
    }

    // Ghi lại mã học viên LMS trên MỌI lần đăng nhập (không chỉ lúc cấp/hạ quyền) —
    // cron/sync-active-students cần cột này để đối chiếu hàng loạt. Lỗi ở đây không
    // được chặn đăng nhập, nên chỉ log.
    const { error: codeErr } = await admin
      .from('profiles')
      .update({ lms_student_code: payload.sub })
      .eq('id', userId);
    if (codeErr) console.error('[sso] không ghi được lms_student_code:', codeErr.message);

    // Học viên còn đang học tại UNICOACH: gói Standard (viết + nói) liên tục,
    // không thu phí, cho đến khi nghỉ học (quyết định của Phan, 27/09/2026).
    // Xem sql/enrolled-standard.sql. Precisely không cần biết gì thêm — nó
    // đọc lại đúng hai cột này qua /api/entitlement.
    if (payload.is_active_student === true) {
      const { error: enrollErr } = await admin
        .from('profiles')
        .update({
          tier: 'standard', tier_expires_at: null,
          speak_plan: 'speak', speak_expires_at: null,
          enrolled_override: true,
        })
        .eq('id', userId);
      if (enrollErr) console.error('[sso] không cấp được gói Standard cho học viên đang học:', enrollErr.message);
    } else if (payload.is_active_student === false) {
      // Chỉ hạ quyền nếu CHÍNH cơ chế này đã cấp (enrolled_override=true) —
      // không bao giờ đụng vào khách đã tự trả tiền.
      const { error: revokeErr } = await admin
        .from('profiles')
        .update({
          tier: 'free', tier_expires_at: null,
          speak_plan: 'free', speak_expires_at: null,
          enrolled_override: false,
        })
        .eq('id', userId)
        .eq('enrolled_override', true);
      if (revokeErr) console.error('[sso] không hạ được quyền sau khi học viên ngừng học:', revokeErr.message);
    }

    // Sinh magic link rồi để /auth/confirm đổi lấy phiên (đặt cookie đúng chuẩn @supabase/ssr).
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink', email,
    });
    if (linkErr) throw linkErr;

    const tokenHash = link?.properties?.hashed_token;
    if (!tokenHash) return fail(origin, 'Không tạo được phiên đăng nhập.');

    // Chặng Writing của bài thi thử 4 kỹ năng (payload.mock_session có giá trị):
    // vào thẳng /mock ở chế độ khoá — không cho chọn đề, không cho làm lại.
    // Khác với luồng luyện tập thường (next=/evaluate).
    const isMockExam = !!payload.mock_session;
    const confirm = new URL('/auth/confirm', origin);
    confirm.searchParams.set('token_hash', tokenHash);
    confirm.searchParams.set('next', isMockExam ? '/mock' : '/evaluate');

    const res = NextResponse.redirect(confirm);
    if (isMockExam) {
      // httpOnly: /mock đọc các cookie này ở server component, không phải JS
      // trình duyệt — học viên không thấy và không sửa được mock_session.
      const opts = { httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 4, path: '/' };
      res.cookies.set('uc_mock_session', payload.mock_session!, opts);
      res.cookies.set('uc_callback', payload.callback ?? '', opts);
      res.cookies.set('uc_student', String(payload.lms_student_id ?? ''), opts);
      // Không có trong tài liệu bàn giao — thêm riêng cho WriteRight để chia
      // đúng tỷ lệ 20:40 khi trung tâm đổi thời gian Writing trong cấu hình đề.
      res.cookies.set('uc_minutes', String(payload.minutes ?? 60), opts);
    }
    return res;
  } catch (e: any) {
    console.error('[sso]', e?.message);
    return fail(origin, 'Lỗi khi tạo phiên: ' + (e?.message || 'không rõ'));
  }
}
