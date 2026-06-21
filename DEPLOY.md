# 🚀 WriteRight — Deployment Guide
# Hướng dẫn triển khai nền tảng IELTS Writing

---

## Tổng quan / Overview

WriteRight là nền tảng luyện IELTS Writing với AI, gồm:
- Landing page với bảng giá
- Trang chấm bài (text + ảnh)
- Dashboard theo dõi tiến bộ
- Google login
- Freemium (miễn phí 5 lượt/ngày, trả phí không giới hạn)

---

## Bước 1: Tạo Supabase Project (Database + Auth)

1. Truy cập https://supabase.com → Sign up miễn phí
2. Click "New Project" → đặt tên "writeright"
3. Chọn region: **Southeast Asia (Singapore)**
4. Đặt database password → ghi lại
5. Đợi 2 phút để project khởi tạo

### Cấu hình Auth (Google Login)
1. Trong Supabase dashboard → **Authentication** → **Providers**
2. Bật **Google** provider
3. Để lấy Google OAuth credentials:
   - Truy cập https://console.cloud.google.com
   - Tạo project mới → APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID và Client Secret → paste vào Supabase

### Tạo Database Tables
1. Trong Supabase → **SQL Editor**
2. Copy toàn bộ nội dung file `supabase-schema.sql`
3. Click **Run** → tất cả tables và policies được tạo tự động

### Lấy API Keys
1. Supabase → **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon/public key**: `eyJ...`

---

## Bước 2: Lấy Anthropic API Key

1. Truy cập https://console.anthropic.com
2. Sign up → API Keys → Create Key
3. Copy key (bắt đầu bằng `sk-ant-...`)
4. Nạp credit: $5–10 (đủ cho hàng trăm lần chấm)

---

## Bước 3: Deploy lên Vercel (FREE)

### Cách 1: Deploy bằng GitHub (khuyến nghị)
1. Tạo GitHub account nếu chưa có
2. Upload thư mục `writeright` lên GitHub repository
3. Truy cập https://vercel.com → Sign up với GitHub
4. Click **"Add New Project"** → Import repository
5. Vercel tự động detect Next.js → Click **Deploy**

### Cách 2: Deploy bằng Vercel CLI
```bash
npm install -g vercel
cd writeright
vercel
```

### Cấu hình Environment Variables
Trong Vercel dashboard → **Settings** → **Environment Variables**, thêm:

| Variable                        | Value                         |
|---------------------------------|-------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://xxx.supabase.co`     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...`                      |
| `ANTHROPIC_API_KEY`             | `sk-ant-...`                  |
| `NEXT_PUBLIC_SITE_URL`          | `https://your-site.vercel.app`|
| `FREE_TIER_LIMIT`              | `5`                           |

Click **Save** → **Redeploy**

---

## Bước 4: Cấu hình Domain (Tùy chọn)

### Dùng domain miễn phí của Vercel
- Site tự động có URL: `https://writeright.vercel.app`

### Dùng domain riêng
1. Mua domain (ví dụ: `writeright.com`) trên Namecheap (~$10/năm)
2. Vercel → Settings → Domains → Add domain
3. Cấu hình DNS theo hướng dẫn của Vercel

---

## Bước 5: Cập nhật Supabase Auth Redirect

Sau khi có URL chính thức:
1. Supabase → Authentication → URL Configuration
2. **Site URL**: `https://writeright.vercel.app` (hoặc domain riêng)
3. **Redirect URLs**: Thêm `https://writeright.vercel.app/auth/callback`

---

## Chi phí hàng tháng / Monthly Cost

| Dịch vụ           | Chi phí          |
|--------------------|------------------|
| Vercel hosting     | Miễn phí (Hobby) |
| Supabase database  | Miễn phí (Free)  |
| Claude API         | ~$10-30/tháng    |
| Domain (tùy chọn) | ~$1/tháng        |
| **Tổng**           | **~$10-30/tháng**|

Với 10 học sinh trả 90,000 VNĐ/tháng = **900,000 VNĐ thu nhập** vs **~250,000 VNĐ chi phí** = **lãi 650,000 VNĐ/tháng** (và tăng theo số học sinh).

---

## Tùy chỉnh / Customization

### Thay đổi tên trung tâm
Tìm "UNICOACH" trong `app/page.tsx` → thay thế

### Thay đổi giá
Sửa phần pricing trong `app/page.tsx`

### Thay đổi số lượt miễn phí
Sửa biến `FREE_TIER_LIMIT` trong Vercel Environment Variables

### Thay đổi model AI
Sửa `claude-sonnet-4-20250514` trong `app/api/evaluate/route.ts`

---

## Cấu trúc thư mục / Folder Structure

```
writeright/
├── app/
│   ├── layout.tsx              ← Root layout
│   ├── page.tsx                ← Landing page
│   ├── globals.css             ← Styles
│   ├── login/page.tsx          ← Google login
│   ├── evaluate/page.tsx       ← Essay evaluation
│   ├── dashboard/page.tsx      ← Student dashboard
│   ├── auth/callback/route.ts  ← OAuth callback
│   └── api/evaluate/route.ts   ← AI evaluation API
├── lib/
│   ├── supabase-browser.ts     ← Browser client
│   └── supabase-server.ts      ← Server client
├── middleware.ts                ← Auth middleware
├── supabase-schema.sql         ← Database setup
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── .env.example
└── DEPLOY.md                   ← This file
```

---

## Xử lý sự cố / Troubleshooting

| Vấn đề | Giải pháp |
|---------|-----------|
| Google login không hoạt động | Kiểm tra OAuth redirect URI trong Google Console |
| "API key not configured" | Kiểm tra ANTHROPIC_API_KEY trong Vercel env vars |
| Chấm bài thất bại | Kiểm tra credit trong Anthropic console |
| Database lỗi | Chạy lại supabase-schema.sql |
| Build lỗi | Chạy `npm install` rồi `npm run build` local trước |

---

## Tính năng mở rộng (giai đoạn sau)

- [ ] Tích hợp VNPay/MoMo cho thanh toán
- [ ] Teacher dashboard (xem bài của tất cả học sinh)
- [ ] Leaderboard (bảng xếp hạng)
- [ ] Forecast đề thi hàng tháng
- [ ] Mobile app (React Native)
- [ ] Writing course (bài học theo level)

---

## Liên hệ hỗ trợ

Hỏi Claude bất cứ lúc nào để được trợ giúp thêm!
