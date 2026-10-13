import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { MAX_IMAGE_BYTES, evalAllowance, normaliseImages, runGrading } from '@/lib/grading';

// Chấm đồng bộ (học viên ngồi chờ kết quả ngay trên trang). Chấm nền/xếp hàng: /api/evaluate/queue.
// Chấm bài gọi AI với max_tokens lớn (bài dài / ảnh chữ viết tay) nên cần chạy lâu hơn mặc định.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
const supabase = await createServerSupabase();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để chấm bài.', code: 'AUTH_REQUIRED' }, { status: 401 });

let body;
try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

const { taskType, taskPrompt, essayText, imageBase64, imageType, images, lessonId } = body;

// Normalise attached images: new `images` array (prompt photo, Task 1 chart, handwritten essay...) with legacy single-image fallback
const imgList = normaliseImages(images, imageBase64, imageType);
const hasImages = imgList.length > 0;

if ((!taskPrompt && !hasImages) || (!essayText && !hasImages))
return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

for (const im of imgList)
if (Math.ceil((im.data.length * 3) / 4) > MAX_IMAGE_BYTES)
return NextResponse.json({ error: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5 MB.' }, { status: 413 });

const allow = await evalAllowance(supabase, user.id);
if (!allow.ok) return NextResponse.json(allow.body, { status: allow.status });

// Trả về dạng stream: gửi khoảng trắng giữ kết nối mỗi 5 giây trong lúc AI chấm, rồi một khối JSON cuối.
// (Khoảng trắng đầu JSON hợp lệ.) Lỗi xảy ra sau khi bắt đầu stream nằm trong body dưới khoá `error`.
const enc = new TextEncoder();
const stream = new ReadableStream({
async start(controller) {
const ping = setInterval(() => { try { controller.enqueue(enc.encode(' ')); } catch {} }, 5000);
try {
const r = await runGrading({ supabase, user, taskType, taskPrompt, essayText, imgList, lessonId, usingFreeCredit: allow.usingFreeCredit });
controller.enqueue(enc.encode(JSON.stringify(r.body)));
} catch (e: any) {
controller.enqueue(enc.encode(JSON.stringify({ error: 'Server error: ' + (e?.message || e) })));
} finally {
clearInterval(ping);
controller.close();
}
},
});
return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
}
