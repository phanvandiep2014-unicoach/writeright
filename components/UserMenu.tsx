'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

type U = { id: string; email?: string; user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string } };

export default function UserMenu() {
  const [user, setUser] = useState<U | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser((data?.user as U) || null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser((session?.user as U) || null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = '/';
  };

  // Loading skeleton — avoid the "Đăng nhập" button flashing before we know
  if (loading) {
    return (
      <div style={{
        width: 96, height: 32, borderRadius: 4,
        background: 'rgba(200,161,75,.08)',
      }} aria-hidden />
    );
  }

  if (!user) {
    return (
      <Link href="/login" style={{
        fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
        color: 'var(--champagne)'
      }}>
        Đăng nhập
      </Link>
    );
  }

  const meta = user.user_metadata || {};
  const displayName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Bạn';
  const initial = displayName.trim().charAt(0).toUpperCase();
  const avatar = meta.avatar_url || meta.picture;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: '1px solid rgba(200,161,75,.30)',
          borderRadius: 999, padding: '4px 12px 4px 4px', cursor: 'pointer',
        }}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" width={26} height={26} style={{ borderRadius: '50%', display: 'block' }} referrerPolicy="no-referrer" />
        ) : (
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--royal-oxblood)', color: 'var(--champagne)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: 13,
          }}>{initial}</span>
        )}
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
          color: 'var(--champagne)', maxWidth: 140, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{displayName}</span>
        <span aria-hidden style={{ color: 'var(--champagne)', opacity: .6, fontSize: 10, lineHeight: 1 }}>▾</span>
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          minWidth: 200,
          background: 'rgba(17,24,58,.98)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(200,161,75,.25)', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          padding: '6px 0', zIndex: 60,
        }}>
          {user.email && (
            <div style={{
              padding: '8px 14px 10px',
              borderBottom: '1px solid rgba(200,161,75,.15)',
              fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--champagne)', opacity: .65,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{user.email}</div>
          )}
          <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} style={menuItem}>
            Dashboard
          </Link>
          <Link href="/evaluate" role="menuitem" onClick={() => setOpen(false)} style={menuItem}>
            Chấm bài mới
          </Link>
          <div style={{ height: 1, background: 'rgba(200,161,75,.15)', margin: '4px 0' }} />
          <button role="menuitem" onClick={logout} style={{ ...menuItem, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

const menuItem: React.CSSProperties = {
  display: 'block',
  padding: '9px 14px',
  fontFamily: 'var(--font-body)', fontSize: 14,
  color: 'var(--champagne)',
  textDecoration: 'none',
};
