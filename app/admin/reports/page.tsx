'use client';
// UNICOACH BMS — Báo cáo gửi phụ huynh (chọn học viên, in / lưu PDF)
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BmsShell, supabase, inputCls, PageHead, btnPri, btnSec } from '@/components/bms/ui';
import StudentReport from '@/components/bms/StudentReport';

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const sid = sp.get('sid') || '';
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('bms_students').select('id, code, name').order('code').then(({ data }) => setStudents(data || []));
  }, []);

  return (
    <>
      <div className="print:hidden">
        <PageHead title="Báo cáo gửi phụ huynh">
          {sid && <button className={btnPri} onClick={() => window.print()}>🖨 In / Lưu PDF</button>}
          {sid && <button className={btnSec} onClick={() => router.push('/admin/reports')}>Chọn học viên khác</button>}
        </PageHead>
        {!sid && (
          <select className={inputCls + ' max-w-sm'} value={sid} onChange={e => e.target.value && router.push('/admin/reports?sid=' + e.target.value)}>
            <option value="">— Chọn học viên —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
        )}
      </div>
      {sid && <StudentReport studentId={sid} printable />}
    </>
  );
}

export default function Page() {
  return (
    <BmsShell>
      <Suspense fallback={<div className="text-navy-400 font-mono">Đang tải…</div>}>
        <Inner />
      </Suspense>
    </BmsShell>
  );
}
