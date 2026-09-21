'use client';
import dynamic from 'next/dynamic';

// Next 15 không cho dùng `ssr: false` trong Server Component, nên trang /share/[token] (Server Component)
// nạp ScorePanel qua wrapper Client này. Hành vi giữ nguyên: ScorePanel chỉ render phía trình duyệt.
export const ScorePanel = dynamic(
  () => import('@/components/ScorePanel').then(m => ({ default: m.ScorePanel })),
  { ssr: false },
);
