-- ════════════════════════════════════════════════════════════════
-- WriteRight — Áp hạn dùng cho TOÀN BỘ tài khoản trả phí đang có
-- Chạy SAU sql/annual-billing.sql
--
-- ⚠️ FILE NÀY CẮT QUYỀN CỦA NGƯỜI DÙNG THẬT. ĐỌC HẾT TRƯỚC KHI CHẠY.
-- ⚠️ Chạy PHẦN 1 (chỉ SELECT) trước. Nhìn danh sách. Rồi mới chạy PHẦN 2.
-- ════════════════════════════════════════════════════════════════
--
-- QUY TẮC (Phan chốt 05/08/2026):
--   • Khách cũ CŨNG phải trả theo tháng, không miễn trừ ai — kể cả tài
--     khoản set tay, tài khoản test, giáo viên, quản trị.
--   • Hạn = ngày thanh toán gần nhất + 30 ngày.
--   • Không có đơn nào đã thanh toán → dùng profiles.updated_at
--     (thời điểm tier được đặt lần cuối) + 30 ngày.
--   • NHƯNG không ai bị cắt sớm hơn HÔM NAY + 7 NGÀY.
--
-- VÌ SAO CÓ SÀN 7 NGÀY
-- --------------------
-- Nếu chỉ lấy "ngày mua + 30", ai trả tiền lần cuối hơn một tháng trước
-- sẽ rơi về `free` ngay giây chạy lệnh — đang dùng bình thường, lần vào
-- tiếp theo thì mất quyền, không một lời báo trước. Mà hệ thống không có
-- auto-renew và không có email nhắc: dashboard là cảnh báo duy nhất, và
-- người đã bị cắt thì chỉ thấy nó SAU KHI đã bị cắt.
--
-- Sàn 7 ngày giữ nguyên tinh thần "thu tiền hàng tháng" nhưng cho mọi
-- người ít nhất một tuần để thấy dòng "còn N ngày · Gia hạn" trên
-- dashboard và tự quyết định. Đổi số 7 ở CẢ BA chỗ bên dưới nếu muốn
-- dài/ngắn hơn.
--
-- Ai còn hạn dài hơn 7 ngày theo cách tính thường thì giữ nguyên hạn dài
-- đó — sàn chỉ nâng lên, không bao giờ hạ xuống.


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
  lp.paid_at                                              as thanh_toan_gan_nhat,
  coalesce(lp.paid_at, p.updated_at) + interval '30 days'  as han_tinh_thuong,
  greatest(
    coalesce(lp.paid_at, p.updated_at) + interval '30 days',
    now() + interval '7 days'
  )                                                        as han_thuc_te,
  case
    when coalesce(lp.paid_at, p.updated_at) + interval '30 days' < now() + interval '7 days'
      then '⏳ duoc an han toi 7 ngay'
    else '✓ con han binh thuong'
  end                                                      as tinh_trang,
  case when lp.paid_at is null then 'khong co don hang' else '' end as ghi_chu
from public.profiles p
left join last_paid lp on lp.user_id = p.id
where p.tier in ('standard', 'premium')
order by han_thuc_te;


-- Đếm nhanh: bao nhiêu người phải nhờ tới sàn ân hạn?
with last_paid as (
  select user_id, max(paid_at) as paid_at
  from public.orders where status = 'paid' group by user_id
)
select
  count(*) filter (
    where coalesce(lp.paid_at, p.updated_at) + interval '30 days' < now()
  ) as da_qua_han_neu_khong_co_an_han,
  count(*) filter (
    where coalesce(lp.paid_at, p.updated_at) + interval '30 days' < now() + interval '7 days'
  ) as se_het_han_trong_7_ngay_toi,
  count(*) as tong_tai_khoan_tra_phi
from public.profiles p
left join last_paid lp on lp.user_id = p.id
where p.tier in ('standard', 'premium');


-- ════════════════════════════════════════════════════════════════
-- PHẦN 2 — GHI THẬT
-- Bỏ dấu chú thích của khối begin…commit bên dưới rồi chạy.
-- Để trong transaction để nếu số dòng trông sai thì rollback.
-- ════════════════════════════════════════════════════════════════

-- begin;
--
-- with last_paid as (
--   select user_id, max(paid_at) as paid_at
--   from public.orders where status = 'paid' group by user_id
-- )
-- update public.profiles p
--    set tier_expires_at = greatest(
--          coalesce(lp.paid_at, p.updated_at) + interval '30 days',
--          now() + interval '7 days'
--        ),
--        updated_at = now()
--   from last_paid lp
--  where lp.user_id = p.id
--    and p.tier in ('standard', 'premium');
--
-- -- Nhóm không có đơn hàng nào (join ở trên bỏ sót) — tính từ updated_at.
-- -- Lưu ý: câu trên đã ghi updated_at = now() cho nhóm CÓ đơn, nên nhóm
-- -- này chắc chắn là nhóm chưa được đụng tới (tier_expires_at còn null).
-- update public.profiles p
--    set tier_expires_at = greatest(
--          p.updated_at + interval '30 days',
--          now() + interval '7 days'
--        )
--  where p.tier in ('standard', 'premium')
--    and p.tier_expires_at is null;
--
-- -- Kiểm tra trước khi chốt — cot da_het_han PHAI bang 0:
-- select tier,
--        count(*)                                          as so_tai_khoan,
--        count(*) filter (where tier_expires_at < now())    as da_het_han,
--        min(tier_expires_at)                               as het_han_som_nhat
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


-- ════════════════════════════════════════════════════════════════
-- VIỆC NÊN LÀM SAU KHI CHẠY
-- ════════════════════════════════════════════════════════════════
-- Lấy danh sách người sắp hết hạn để nhắn tay (chưa có email tự động):
--
--   select p.id, p.full_name, u.email, p.tier, p.tier_expires_at
--     from public.profiles p
--     join auth.users u on u.id = p.id
--    where p.tier in ('standard','premium')
--      and p.tier_expires_at between now() and now() + interval '7 days'
--    order by p.tier_expires_at;
