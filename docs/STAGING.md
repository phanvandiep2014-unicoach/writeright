# WriteRight — môi trường staging

Mục đích: thử thay đổi (code + migration SQL) trước khi lên production, để không lặp lại sự cố kiểu
"orders.speak_plan chưa có trên production" (23/09 → 04/10/2026, webhook coi mọi đơn là không tồn tại).

## Hiện có

| Thành phần | Giá trị |
|---|---|
| Supabase staging | project `writeright-staging`, ref `pwvrtafdxqjiyqxsiaqa`, URL `https://pwvrtafdxqjiyqxsiaqa.supabase.co` (gói free, ap-southeast-1) |
| Cấu trúc | đã nạp từ `supabase/schema-production.sql` (20 bảng, 210 cột, 39 policy, 78 ràng buộc — khớp production 05/10/2026). KHÔNG có dữ liệu thật |
| Chưa nạp | `sql/public-stats.sql` (hàm `wr_public_stats`, chỉ phục vụ số liệu trang chủ). Cần thì chạy riêng trong SQL Editor của staging |

## CẢNH BÁO — Preview của các nhánh KHÁC `staging` vẫn trỏ vào CSDL production

Đã xử lý riêng cho nhánh `staging` (06/10/2026: ghi đè Supabase URL/anon/service_role sang staging, vô hiệu hóa PAYOS_* và
UNICOACH_*; SMTP_* vốn chỉ đặt cho Production). Nhánh khác/PR vẫn như mô tả dưới đây — đừng thử tính năng ghi dữ liệu ở đó.

Trên Vercel, các biến `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `PAYOS_*` đang đặt cho "Production and Preview". Mọi bản Preview (mọi nhánh, mọi PR) vì vậy
đọc/ghi thẳng CSDL thật. Phải tách trước khi dùng Preview để thử tính năng ghi dữ liệu.

## Việc cần làm một lần (cần chủ dự án — đây là khóa bí mật)

1. Supabase (project staging) → Settings → API: chép `anon` key và `service_role` key.
2. Vercel → dự án `writeright` (trước 05/10/2026 tên `writeright-w5r9`, cùng một dự án) → Settings → Environment Variables. Thêm 3 biến, môi trường **Preview**, nhánh **staging**
   (Vercel cho phép biến riêng theo nhánh, ghi đè biến "Preview" chung):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://pwvrtafdxqjiyqxsiaqa.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key của staging
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key của staging
3. Nên ghi đè tiếp cho nhánh `staging` (để giá trị rỗng hoặc khóa test): `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`,
   `PAYOS_CHECKSUM_KEY` (khách thật không bao giờ được trả tiền ở staging), `SMTP_*`/`MAIL_FROM` (không gửi email thật),
   `UNICOACH_API_KEY`/`UNICOACH_SSO_SECRET` (không đồng bộ với LMS thật). `CRON_SECRET` không đặt cho Preview → cron không chạy.
4. Supabase staging → Authentication → URL Configuration: Site URL và Redirect URLs thêm domain preview của nhánh `staging`.
   Muốn đăng nhập Google ở staging thì phải bật provider Google riêng (OAuth client riêng).
5. Tạo nhánh: `git push origin main:staging`. Mỗi lần đẩy vào `staging` Vercel tạo bản Preview trỏ staging.

## Quy trình đổi CSDL từ nay

1. Viết migration trong `sql/` VÀ cập nhật `supabase/schema-production.sql` trong cùng commit.
2. Chạy migration trên staging trước, thử trên bản Preview của nhánh `staging`.
3. Đạt thì chạy migration đó trên production RỒI mới merge code vào `main`.
   (Code chạy được cả khi cột mới chưa có là tốt, nhưng đừng dựa vào đó — xem `payos-webhook` và `checkout`.)

## Giới hạn

- Staging không có dữ liệu mẫu. Muốn thử luồng chấm bài: đăng ký một tài khoản thử, chấm vài bài.
- `ANTHROPIC_API_KEY` vẫn dùng chung khóa thật (tính tiền theo lượt chấm). Cần tách thì tạo khóa riêng có hạn mức thấp.
