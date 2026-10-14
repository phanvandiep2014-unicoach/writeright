// Đường dẫn gốc khi app chạy dưới tiền tố (vd. "/writeright" khi phục vụ qua unicoach.vn/writeright).
// Để trống = chạy ở gốc domain như bình thường. Đặt bằng biến môi trường NEXT_PUBLIC_BASE_PATH LÚC BUILD.
// Next tự thêm tiền tố cho <Link>, router và /_next; còn fetch('/api/...'), window.location, <img src> thì KHÔNG
// — những chỗ đó phải đi qua withBase().
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const withBase = (p: string): string => (p.startsWith('/') && !p.startsWith('//') ? BASE + p : p);
