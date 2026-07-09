'use client';
// UNICOACH — Cổng phụ huynh & học viên: xem tiến bộ, báo cáo (đăng nhập Google)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, inputCls } from '@/components/bms/ui';
import StudentReport from '@/components/bms/StudentReport';

export default function FamilyPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'none' | 'ok'>('loading');
  const [children, setChildren] = useState<any[]>([]);
  const [sel, setSel] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?next=/family'); return; }
      // Học viên do mình là phụ huynh, hoặc chính mình là học viên
      const { data } = await supabase.from('bms_students')
        .select('id, code, name')
        .or(`parent_user_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('name');
      if (!data || data.length === 0) { setState('none'); return; }
      setChildren(data);
      setSel(data[0].id);
      setState('ok');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F4ECD8]">
      <header className="bg-[#11183A] print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-white font-bold tracking-widest text-lg">UNICOACH</div>
            <div className="text-[10px] tracking-[.25em] text-[#C8A14B]">PER TE · AD ASTRA</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-[#C8A14B] hover:underline">WriteRight</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="text-white/70 hover:text-white">Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {state === 'loading' && <p className="text-gray-500 font-mono">Đang tải…</p>}
        {state === 'none' && (
          <div className="bg-white rounded-xl border border-[#E5DEC9] p-8 text-center">
            <h2 className="text-[#11183A] font-bold text-lg mb-2">Chưa liên kết học viên</h2>
            <p className="text-gray-600 text-sm">
              Tài khoản Google của bạn chưa được liên kết với học viên nào tại UNICOACH.<br />
              Vui lòng báo trung tâm email bạn vừa đăng nhập để được liên kết với hồ sơ của con.
            </p>
          </div>
        )}
        {state === 'ok' && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5 print:hidden">
              <h1 className="text-xl font-bold text-[#11183A]">Kết quả học tập</h1>
              <div className="flex gap-2">
                {children.length > 1 && (
                  <select className={inputCls + ' !bg-white !text-gray-800 !border-[#E5DEC9] max-w-[240px]'} value={sel} onChange={e => setSel(e.target.value)}>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#11183A] text-white hover:opacity-90">🖨 In / Lưu PDF</button>
              </div>
            </div>
            {sel && <StudentReport studentId={sel} printable />}
          </>
        )}
      </main>
    </div>
  );
}
