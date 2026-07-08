'use client';
// UNICOACH BMS — Báo cáo học tập của 1 học viên (dùng chung cho staff & phụ huynh)
// Gồm: điểm theo lớp + chuyên cần + điểm WriteRight (IELTS Writing band)
import { useEffect, useState } from 'react';
import { supabase, fmtDate, GRADE_TYPES, Empty } from '@/components/bms/ui';

const avg = (grades: any[]) => {
  const tw = grades.reduce((t, g) => t + Number(g.weight), 0);
  return tw ? Math.round(grades.reduce((t, g) => t + (Number(g.score) / Number(g.max_score)) * 10 * Number(g.weight), 0) / tw * 100) / 100 : null;
};

function Spark({ points, max = 10 }: { points: number[]; max?: number }) {
  if (points.length < 2) return null;
  const W = 220, H = 48;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (W - 8) + 4);
  const ys = points.map(p => H - 6 - (p / max) * (H - 12));
  return (
    <svg width={W} height={H} className="block">
      <polyline fill="none" stroke="#C8A14B" strokeWidth="2" points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')} />
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="2.5" fill="#C8A14B" />)}
    </svg>
  );
}

export default function StudentReport({ studentId, printable }: { studentId: string; printable?: boolean }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('bms_students').select('*').eq('id', studentId).single();
      if (!s) { setData({ missing: true }); return; }
      const { data: en } = await supabase.from('bms_enrollments')
        .select('class_id, bms_classes(*, teacher:profiles!bms_classes_teacher_id_fkey(full_name))')
        .eq('student_id', studentId);
      const classes = (en || []).map((e: any) => e.bms_classes).filter(Boolean);
      const [gr, at, wr] = await Promise.all([
        supabase.from('bms_grades').select('*').eq('student_id', studentId).order('date'),
        supabase.from('bms_attendance').select('class_id,status').eq('student_id', studentId),
        s.user_id
          ? supabase.from('evaluations').select('created_at, overall_band, task_type, ta_band, cc_band, lr_band, gra_band')
              .eq('user_id', s.user_id).not('overall_band', 'is', null).order('created_at').limit(50)
          : Promise.resolve({ data: [] } as any),
      ]);
      setData({ student: s, classes, grades: gr.data || [], attendance: at.data || [], writeright: wr.data || [] });
    })();
  }, [studentId]);

  if (!data) return <div className="text-navy-400 font-mono">Đang tải báo cáo…</div>;
  if (data.missing) return <Empty msg="Không tìm thấy học viên (hoặc bạn không có quyền xem)" />;
  const { student: s, classes, grades, attendance, writeright } = data;

  const box = printable
    ? 'border border-gray-300 rounded-xl p-5 mb-4 break-inside-avoid bg-white'
    : 'bg-navy-800/60 border border-navy-700 rounded-xl p-5 mb-4';
  const tx = printable ? 'text-gray-800' : 'text-navy-100';
  const tt = printable ? 'text-[#11183A]' : 'text-white';
  const mut = printable ? 'text-gray-500' : 'text-navy-400';
  const gold = 'text-[#C8A14B]';

  return (
    <div className={printable ? 'bg-white text-gray-800 rounded-xl p-6' : ''}>
      {printable && (
        <div className="flex justify-between items-center border-b-4 border-[#11183A] pb-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#11183A] tracking-widest">UNICOACH</h1>
            <div className="text-[10px] tracking-[.25em] text-[#8A6A28]">PER TE · AD ASTRA — EST. MMXIX · HÀ NỘI</div>
            <p className="text-sm text-gray-500 mt-1">BÁO CÁO KẾT QUẢ HỌC TẬP</p>
          </div>
          <div className="text-right text-xs text-gray-500">Ngày lập: {fmtDate(new Date().toISOString())}</div>
        </div>
      )}

      <div className={box}>
        <h3 className={`${tt} font-semibold mb-1`}>Học viên: {s.name} <span className="font-mono text-sm">({s.code})</span></h3>
        <p className={`text-sm ${mut}`}>Ngày sinh: {fmtDate(s.dob) || '—'} · Phụ huynh: {s.parent_name || '—'} · Nhập học: {fmtDate(s.joined_at)}</p>
      </div>

      {classes.map((c: any) => {
        const cg = grades.filter((g: any) => g.class_id === c.id);
        const ca = attendance.filter((a: any) => a.class_id === c.id);
        const count = (st: string) => ca.filter((a: any) => a.status === st).length;
        const a10 = avg(cg);
        return (
          <div key={c.id} className={box}>
            <h3 className={`${tt} font-semibold`}>{c.name}{c.subject ? ' · ' + c.subject : ''}</h3>
            <p className={`text-xs ${mut} mb-3`}>GV: {c.teacher?.full_name || '—'} · {c.schedule || ''}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-center">
              <div><div className={`text-xl font-bold ${gold}`}>{a10 ?? '—'}</div><div className={`text-xs ${mut}`}>Điểm TB (/10)</div></div>
              <div><div className={`text-xl font-bold ${tt}`}>{count('present')}</div><div className={`text-xs ${mut}`}>Buổi có mặt</div></div>
              <div><div className={`text-xl font-bold ${tt}`}>{count('absent')}</div><div className={`text-xs ${mut}`}>Vắng</div></div>
              <div><div className={`text-xl font-bold ${tt}`}>{count('late') + count('excused')}</div><div className={`text-xs ${mut}`}>Muộn / có phép</div></div>
            </div>
            {cg.length > 1 && <Spark points={cg.map((g: any) => Number(g.score) / Number(g.max_score) * 10)} />}
            {cg.length === 0 ? <p className={`text-sm ${mut}`}>Chưa có bài kiểm tra</p> : (
              <table className="w-full mt-2">
                <thead><tr>{['Ngày', 'Loại', 'Bài', 'Điểm', 'Nhận xét'].map(hd =>
                  <th key={hd} className={`text-left text-[10px] font-mono uppercase ${mut} py-1 pr-2`}>{hd}</th>)}</tr></thead>
                <tbody>
                  {cg.map((g: any) => (
                    <tr key={g.id} className={printable ? 'border-t border-gray-200' : 'border-t border-navy-700/60'}>
                      <td className={`py-1.5 pr-2 text-xs ${tx}`}>{fmtDate(g.date)}</td>
                      <td className={`py-1.5 pr-2 text-xs ${tx}`}>{GRADE_TYPES[g.type] || g.type}</td>
                      <td className={`py-1.5 pr-2 text-xs ${tx}`}>{g.name}</td>
                      <td className={`py-1.5 pr-2 text-xs font-bold ${gold}`}>{g.score}/{g.max_score}</td>
                      <td className={`py-1.5 text-xs ${tx}`}>{g.comment || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <div className={box}>
        <h3 className={`${tt} font-semibold mb-1`}>✍️ WriteRight — IELTS Writing</h3>
        {!s.user_id ? (
          <p className={`text-sm ${mut}`}>Chưa liên kết tài khoản WriteRight (nhập email học viên trong hồ sơ để tự liên kết).</p>
        ) : writeright.length === 0 ? (
          <p className={`text-sm ${mut}`}>Chưa có bài chấm trên WriteRight.</p>
        ) : (
          <>
            <p className={`text-sm ${tx} mb-2`}>
              {writeright.length} bài đã chấm · Band gần nhất: <b className={gold}>{writeright[writeright.length - 1].overall_band}</b>
              {' '}· Cao nhất: <b className={gold}>{Math.max(...writeright.map((w: any) => Number(w.overall_band)))}</b>
            </p>
            <Spark points={writeright.map((w: any) => Number(w.overall_band))} max={9} />
            <div className={`text-xs ${mut} mt-2`}>
              Gần nhất — TA {writeright[writeright.length - 1].ta_band} · CC {writeright[writeright.length - 1].cc_band} · LR {writeright[writeright.length - 1].lr_band} · GRA {writeright[writeright.length - 1].gra_band}
            </div>
          </>
        )}
      </div>

      {printable && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Báo cáo tạo tự động từ hệ thống UNICOACH · unicoach.vn — "Per te, ad astra"
        </p>
      )}
    </div>
  );
}
