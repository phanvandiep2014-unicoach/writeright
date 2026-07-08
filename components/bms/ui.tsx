'use client';
// UNICOACH BMS — shared UI (shell, guard, modal, form helpers)
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
  homework: 'Bài tập', quiz: 'Kiểm tra', midterm: 'Giữa kỳ', final: 'Cuối kỳ', speaking: 'Speaking', mock: 'Thi thử',
};
export const fmtDate = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');
export const today = () => new Date().toISOString().slice(0, 10);

// ---------- Context ----------
type BmsUser = { id: string; email: string; name: string; role: string };
const BmsCtx = createContext<BmsUser | null>(null);
export const useBmsUser = () => useContext(BmsCtx)!;

const NAV = [
  { href: '/admin', label: '🏠 Tổng quan', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/students', label: '🎓 Học viên', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/classes', label: '📚 Lớp học', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/reports', label: '📄 Báo cáo PH', roles: ['admin', 'teacher'] },
  { href: '/admin/rooms', label: '🏢 Phòng họp', roles: ['admin', 'teacher', 'assistant'] },
  { href: '/admin/notes', label: '📝 Biên bản họp', roles: ['admin', 'teacher', 'assistant'] },
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

  if (state === 'loading') return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-navy-400 font-mono">Đang tải…</div>;
  if (state === 'denied') return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 font-mono mb-2">Tài khoản của bạn chưa được cấp quyền quản lý.</p>
        <p className="text-navy-400 text-sm">Liên hệ quản trị viên UNICOACH để được gán vai trò.</p>
        <Link href="/" className="text-brand-500 underline text-sm">← Về trang chủ</Link>
      </div>
    </div>
  );

  return (
    <BmsCtx.Provider value={user}>
      <div className="min-h-screen bg-navy-900">
        <header className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur border-b border-navy-700 print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-white font-semibold tracking-widest">UNICOACH <span className="text-brand-500">BMS</span></Link>
              <nav className="flex gap-1 flex-wrap">
                {NAV.filter(n => n.roles.includes(user!.role)).map(n => (
                  <Link key={n.href} href={n.href}
                    className={`px-3 py-1.5 rounded-lg text-sm ${pathname === n.href ? 'bg-navy-700 text-white' : 'text-navy-400 hover:text-white'}`}>
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-navy-400">{user!.name} · <span className="text-brand-500">{ROLE_NAMES[user!.role]}</span></span>
              <Link href="/dashboard" className="text-xs font-mono text-navy-400 hover:text-white">WriteRight →</Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    </BmsCtx.Provider>
  );
}

// ---------- Components nhỏ ----------
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-navy-800 border border-navy-600 rounded-2xl p-6 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto`}>
        <h3 className="text-white font-semibold mb-4">{title}</h3>
        {children}
        {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-navy-300 border border-navy-600 hover:bg-navy-700">Đóng</button>
          {onSave && (
            <button disabled={busy}
              onClick={async () => { setBusy(true); setErr(''); try { await onSave(); onClose(); } catch (e: any) { setErr(e.message || 'Lỗi'); } finally { setBusy(false); } }}
              className="px-4 py-2 rounded-lg text-sm bg-brand-500 text-navy-900 font-semibold hover:opacity-90 disabled:opacity-50">
              {busy ? 'Đang lưu…' : saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const inputCls = 'w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 outline-none';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-mono text-navy-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="text-left text-xs font-mono uppercase text-navy-400 px-3 py-2 border-b border-navy-600">{children}</th>;
}
export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 border-b border-navy-700/60 text-sm text-navy-100 ${className}`}>{children}</td>;
}
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="bg-navy-800/60 border border-navy-700 rounded-xl overflow-x-auto"><table className="w-full min-w-[640px]">{children}</table></div>;
}
export function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-navy-400 py-10">{msg}</div>;
}
export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
      <h1 className="text-xl text-white font-semibold">{title}</h1>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
export const btnPri = 'px-4 py-2 rounded-lg text-sm bg-brand-500 text-navy-900 font-semibold hover:opacity-90';
export const btnSec = 'px-4 py-2 rounded-lg text-sm text-navy-300 border border-navy-600 hover:bg-navy-700';
export const btnSm = 'px-2.5 py-1 rounded-md text-xs border border-navy-600 text-navy-300 hover:bg-navy-700';
export const btnSmDanger = 'px-2.5 py-1 rounded-md text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10';
