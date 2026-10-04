/**
 * Tạo (hoặc lấy lại) link chia sẻ một bài chấm. Mọi nút chia sẻ dùng chung hàm này.
 *
 * 04/10/2026: ShareScore và trang hồ sơ tự đọc cột `shares.token` — cột đó KHÔNG có trên
 * production (bảng có `id` + `share_token`), nên nút "Chia sẻ kết quả" luôn báo lỗi. Đi qua
 * /api/share-token (đã chạy thật, tạo ra 137 lượt chia sẻ qua EvalCard) và dùng link /e/<id>.
 */
export async function getShareUrl(evaluationId: string): Promise<string> {
  const res = await fetch('/api/share-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evaluationId }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.token) throw new Error(j?.error || 'Không tạo được link chia sẻ');
  return `${window.location.origin}/e/${j.token}`;
}
