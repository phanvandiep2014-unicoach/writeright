'use client';
// UNICOACH BMS — shared UI v2 (tối giản, hiện đại, tương tác)
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export const supabase = createClient();

// ---------- Hằng số tiếng Việt ----------
export const ROLE_NAMES: Record<string, string> = {
  admin: 'Quản trị viên', teacher: 'Giáo viên', assistant: 'Trợ giảng', parent: 'Phụ huynh', student: 'Học viên',
};
export const STUDENT_STATUS: Record<string, [string, string]> = {
  active: ['Đang học', 'text-emerald-400 bg-emerald-400/10'],
  paused: ['Tạm nghỉ', 'text-amber-400 bg-amber-400/10'],
  finished: ['Đã hoàn thành', 'text-navy-400 bg-navy-700/40'],
};
export const CLASS_STATUS: Record<string, [string, string]> = {
  open: ['Sắp mở', 'text-sky-400 bg-sky-400/10'],
  running: ['Đang học', 'text-emerald-400 bg-emerald-400/10'],
  finished: ['Kết thúc', 'text-navy-400 bg-navy-700/40'],
  cancelled: ['Đã hủy', 'text-red-400 bg-red-400/10'],
};
export const ATT_STATUS: Record<string, [string, string]> = {
  present: ['Có mặt', 'bg-emerald-500 text-white'],
  absent: ['Vắng', 'bg-red-500 text-white'],
  late: ['Muộn', 'bg-amber-500 text-white'],
  excused: ['Có phép', 'bg-sky-500 text-white'],
};
export const GRADE_TYPES: Record<string, string> = {
  homework: 'Bài tập', quiz: 'Kiểm tra', midterm: 'Giữa kỳ', final: 'Cuối kỳ', speaking: 'Speaking', mock: 'Thi thử', classroom: 'Classroom',
};
export const FEE_STATUS: Record<string, [string, string]> = {
  unpaid: ['Chưa thu', 'text-red-400 bg-red-400/10'],
  partial: ['Thu một phần', 'text-amber-400 bg-amber-400/10'],
  paid: ['Đã thu', 'text-emerald-400 bg-emerald-400/10'],
};
export const DAY_NAMES = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const fmtDate = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');
export const today = () => new Date().toISOString().slice(0, 10);

// ---------- Context ----------
type BmsUser = { id: string; email: string; name: string; role: string };
const BmsCtx = createContext<BmsUser | null>(null);
export const useBmsUser = () => useContext(BmsCtx)!;

const NAV = [
  { href: '/admin', label: 'Tổng quan', icon: '◆', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/schedule', label: 'Lịch tuần', icon: '📅', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/students', label: 'Học viên', icon: '🎓', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/classes', label: 'Lớp học', icon: '📚', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/fees', label: 'Học phí', icon: '💰', roles: ['admin'] },
  { href: '/admin/classroom', label: 'Classroom', icon: '🔗', roles: ['admin', 'teacher'] },
  { href: '/admin/reports', label: 'Báo cáo', icon: '📄', roles: ['admin', 'teacher'] },
  { href: '/admin/rooms', label: 'Phòng họp', icon: '🏢', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/notes', label: 'Biên bản', icon: '📝', roles: ['admin', 'teacher', 'assistant'] },
];

// ---------- Shell + role guard ----------
export function BmsShell({ children, allow = ['admin', 'teacher', 'assistant'] }: { children: ReactNode; allow?: string[] }) {
  const [user, setUser] = useState<BmsUser | null>(null);
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login?next=' + encodeURIComponent(pathname)); return; }
      const { data: prof } = await supabase.from('profiles').select('role, full_name').eq('id', u.id).single();
      const role = prof?.role || '';
      if (!allow.includes(role)) { setState('denied'); return; }
      setUser({ id: u.id, email: u.email || '', name: prof?.full_name || u.email || '', role });
      setState('ok');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="animate-pulse text-navy-400 text-sm tracking-widest">UNICOACH · Đang tải…</div>
    </div>
  );
  if (state === 'denied') return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="text-3xl mb-3">🔒</div>
        <p className="text-white font-semibold mb-1">Chưa được cấp quyền quản lý</p>
        <p className="text-navy-400 text-sm mb-4">Liên hệ quản trị viên UNICOACH để được gán vai trò cho tài khoản này.</p>
        <Link href="/" className="text-brand-500 underline text-sm">← Về trang chủ</Link>
      </div>
    </div>
  );

  return (
    <BmsCtx.Provider value={user}>
      <div className="min-h-screen bg-navy-900">
        <header className="sticky top-0 z-40 bg-navy-900/90 backdrop-blur-md border-b border-white/5 print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/admin" className="text-white font-semibold tracking-[.2em] text-sm">
                UNICOACH <span className="text-brand-500">BMS</span>
              </Link>
              <nav className="flex gap-1 flex-wrap">
                {NAV.filter(n => n.roles.includes(user!.role)).map(n => {
                  const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
                  return (
                    <Link key={n.href} href={n.href}
                      className={`px-3 py-1.5 rounded-full text-[13px] transition-all duration-150 ${active
                        ? 'bg-brand-500/15 text-brand-500 font-semibold'
                        : 'text-navy-400 hover:text-white hover:bg-white/5'}`}>
                      <span className="mr-1 text-[11px]">{n.icon}</span>{n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-navy-400 hidden md:inline">{user!.name} · <span className="text-brand-500">{ROLE_NAMES[user!.role]}</span></span>
              <Link href="/dashboard" className="px-3 py-1.5 rounded-full text-navy-400 hover:text-white hover:bg-white/5 transition-all">WriteRight →</Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    </BmsCtx.Provider>
  );
}

// ---------- Components ----------
export function Badge({ map, k }: { map: Record<string, [string, string]>; k: string }) {
  const [label, cls] = map[k] || [k, 'text-navy-400 bg-navy-700/40'];
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}

export function Modal({ title, onClose, children, onSave, saveLabel = 'Lưu', wide }: {
  title: string; onClose: () => void; children: ReactNode; onSave?: () => Promise<void> | void; saveLabel?: string; wide?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-navy-800 border border-white/10 rounded-3xl p-6 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <h3 className="text-white font-semibold mb-4">{title}</h3>
        {children}
        {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className={btnSec}>Đóng</button>
          {onSave && (
            <button disabled={busy}
              onClick={async () => { setBusy(true); setErr(''); try { await onSave(); onClose(); } catch (e: any) { setErr(e.message || 'Lỗi'); } finally { setBusy(false); } }}
              className={btnPri + ' disabled:opacity-50'}>
              {busy ? 'Đang lưu…' : saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const inputCls = 'w-full bg-navy-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] uppercase tracking-wider text-navy-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-navy-800/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors ${className}`}>{children}</div>;
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="text-left text-[11px] uppercase tracking-wider text-navy-400 px-3 py-2.5 border-b border-white/5">{children}</th>;
}
export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-3 border-b border-white/5 text-sm text-navy-100 ${className}`}>{children}</td>;
}
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="bg-navy-800/50 border border-white/5 rounded-2xl overflow-x-auto"><table className="w-full min-w-[640px]">{children}</table></div>;
}
export function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-navy-400 py-12 text-sm">{msg}</div>;
}
export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <h1 className="text-xl text-white font-semibold tracking-tight">{title}</h1>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  );
}
export const btnPri = 'px-4 py-2 rounded-xl text-sm bg-brand-500 text-navy-900 font-semibold hover:opacity-90 active:scale-95 transition-all';
export const btnSec = 'px-4 py-2 rounded-xl text-sm text-navy-300 border border-white/10 hover:bg-white/5 active:scale-95 transition-all';
export const btnSm = 'px-2.5 py-1 rounded-lg text-xs border border-white/10 text-navy-300 hover:bg-white/5 hover:text-white transition-all';
export const btnSmDanger = 'px-2.5 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all';
