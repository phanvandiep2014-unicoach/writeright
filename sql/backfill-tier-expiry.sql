-- ════════════════════════════════════════════════════════════════
-- WriteRight — Áp hạn dùng cho TOÀN BỘ tài khoản trả phí đang có
-- Chạy SAU sql/annual-billing.sql
--
-- ⚠️ FILE NÀY CẮT QUYỀN CỦA NGƯỜI DÙNG THẬT. ĐỌC HẾT TRƯỚC KHI CHẠY.
-- ⚠️ Chạy PHẦN 1 (chỉ SELECT) trước. Nhìn danh sách. Rồi mới chạy PHẦN 2.
-- ════════════════════════════════════════════════════════════════
--
-- QUY TẮC (Phan chốt 05/08/2026):
--   • Hạn = ngày thanh toán gần nhất + 30 ngày.
--   • Không tìm thấy đơn nào đã thanh toán → dùng profiles.updated_at
--     (thời điểm tier được đặt lần cuối) + 30 ngày.
--   • Áp cho TẤT CẢ tài khoản standard/premium. Không miễn trừ ai —
--     kể cả tài khoản set tay, tài khoản test, giáo viên, quản trị.
--
-- HỆ QUẢ PHẢI BIẾT TRƯỚC:
--   Ai thanh toán lần cuối cách đây hơn 30 ngày sẽ rơi về `free`
--   NGAY LẬP TỨC khi chạy PHẦN 2, không có ngày ân hạn nào. Họ đang
--   dùng bình thường, và lần vào tiếp theo sẽ thấy mình mất quyền.
--   Hãy nhắn cho họ TRƯỚC khi chạy — xem PHẦN 1 để biết là những ai.


-- ════════════════════════════════════════════════════════════════
-- PHẦN 1 — XEM TRƯỚC (chỉ đọc, không đổi gì)
-- ════════════════════════════════════════════════════════════════

with last_paid as (
  select user_id, max(paid_at) as paid_at
  from public.orders
  where status = 'paid'
  group by user_id
)
select
  p.id,
  p.full_name,
  p.tier,
  p.role,
  lp.paid_at                                            as thanh_toan_gan_nhat,
  coalesce(lp.paid_at, p.updated_at) + interval '30 days' as han_moi,
  case
    when coalesce(lp.paid_at, p.updated_at) + interval '30 days' < now()
      then '❗ MAT QUYEN NGAY'
    else '✓ con han'
  end                                                    as tinh_trang,
  case when lp.paid_at is null then 'khong co don hang' else '' end as ghi_chu
from public.profiles p
left join last_paid lp on lp.user_id = p.id
where p.tier in ('standard', 'premium')
order by tinh_trang, han_moi;


-- Đếm nhanh: bao nhiêu người mất quyền ngay?
with last_paid as (
  select user_id, max(paid_at) as paid_at
  from public.orders where status = 'paid' group by user_id
)
select
  count(*) filter (
    where coalesce(lp.paid_at, p.updated_at) + interval '30 days' < now()
  ) as mat_quyen_ngay,
  count(*) filter (
    where coalesce(lp.paid_at, p.updated_at) + interval '30 days' >= now()
  ) as con_han,
  count(*) as tong_tai_khoan_tra_phi
from public.profiles p
left join last_paid lp on lp.user_id = p.id
where p.tier in ('standard', 'premium');


-- ════════════════════════════════════════════════════════════════
-- PHẦN 2 — GHI THẬT
-- Bỏ dấu chú thích của khối BEGIN…COMMIT bên dưới rồi chạy.
-- Để trong transaction để nếu số dòng cập nhật trông sai thì ROLLBACK.
-- ════════════════════════════════════════════════════════════════

-- begin;
--
-- with last_paid as (
--   select user_id, max(paid_at) as paid_at
--   from public.orders where status = 'paid' group by user_id
-- )
-- update public.profiles p
--    set tier_expires_at = coalesce(lp.paid_at, p.updated_at) + interval '30 days',
--        updated_at      = now()
--   from last_paid lp
--  where lp.user_id = p.id
--    and p.tier in ('standard', 'premium');
--
-- -- Nhóm không có đơn hàng nào (join ở trên bỏ sót) — tính từ updated_at.
-- update public.profiles p
--    set tier_expires_at = p.updated_at + interval '30 days'
--  where p.tier in ('standard', 'premium')
--    and p.tier_expires_at is null;
--
-- -- Kiểm tra trước khi chốt:
-- select tier, count(*),
--        count(*) filter (where tier_expires_at < now()) as da_het_han
--   from public.profiles
--  where tier in ('standard','premium')
--  group by tier;
--
-- commit;   -- đổi thành rollback; nếu con số trông sai


-- ════════════════════════════════════════════════════════════════
-- HOÀN TÁC (nếu chạy nhầm)
-- ════════════════════════════════════════════════════════════════
-- Trả mọi tài khoản về trạng thái không hết hạn:
--
--   update public.profiles set tier_expires_at = null
--    where tier in ('standard','premium');
--
-- Lưu ý: câu này cũng xoá hạn của những đơn MỚI mua sau khi đã bật
-- tính năng hạn dùng. Chỉ dùng khi vừa chạy nhầm PHẦN 2 và chưa có
-- đơn mới nào phát sinh.
