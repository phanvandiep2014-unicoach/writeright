'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/track-client';

// Chi dem luot xem cac trang dau phieu; cac trang khac khong gui gi.
const WATCH = new Set(['/', '/evaluate', '/login', '/pricing', '/mock']);

export default function FunnelTracker() {
  const path = usePathname();
  useEffect(() => {
    if (path && WATCH.has(path)) track('page_view', path);
  }, [path]);
  return null;
}
