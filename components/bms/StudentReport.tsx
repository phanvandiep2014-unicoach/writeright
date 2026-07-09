'use client';
// UNICOACH BMS — Báo cáo học tập v2: biểu đồ trực quan cho phụ huynh
// Gồm: điểm (bar chart so TB lớp) + chuyên cần (donut) + học phí + WriteRight (trend)
import { useEffect, useState } from 'react';
import { supabase, fmtDate, GRADE_TYPES, FEE_STATUS, Empty, Badge } from '@/components/bms/ui';
import { Donut, Bars, Trend, fmtMoney, EMERALD, RED, AMBER, SKY } from '@/components/bms/charts';

const avg = (grades: any[]) => {
  const tw = grades.reduce((t, g) => t + Number(g.weight), 0);
  return tw ? Math.round(grades.reduce((t, g) => t + (Number(g.score) / Number(g.max_score)) * 10 * Number(g.weight), 0) / tw * 100) / 100 : null;
};

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
      const [gr, at, fe, wr, cg] = await Promise.all([
        supabase.from('bms_grades').select('*').eq('student_id', studentId).order('date'),
        supabase.from('bms_attendance').select('class_id,status').eq('student_id', studentId),
        supabase.from('bms_fees').select('*').eq('student_id', studentId).order('due_date'),
        s.user_id
          ? supabase.from('evaluations').select('created_at, overall_band, ta_band, cc_band, lr_band, gra_band')
              .eq('user_id', s.user_id).not('overall_band', 'is', null).order('created_at').limit(50)
          : Promise.resolve({ data: [] } as any),
        classes.length
          ? supabase.from('bms_grades').select('class_id, score, max_score, weight').in('class_id', classes.map((c: any) => c.id))
          : Promise.resolve({ data: [] } as any),
      ]);
      setData({ student: s, classes, grades: gr.data || [], attendance: at.data || [], fees: fe.data || [], writeright: wr.data || [], classGrades: cg.data || [] });
    })();
  }, [studentId]);

  if (!data) return <div className="text-navy-400 text-sm">Đang tải báo cáo…</div>;
  if (data.missing) return <Empty msg="Không tìm thấy học viên (hoặc bạn không có quyền xem)" />;
  const { student: s, classes, grades, attendance, fees, writeright, classGrades } = data;

  const box = printable
    ? 'border border-gray-200 rounded-2xl p-5 mb-4 break-inside-avoid bg-white'
    : 'bg-navy-800/50 border border-white/5 rounded-2xl p-5 mb-4';
  const tx = printable ? 'text-gray-700' : 'text-navy-100';
  const tt = printable ? 'text-[#11183A]' : 'text-white';
  const mut = printable ? 'text-gray-500' : 'text-navy-400';
  const feeDue = fees.reduce((t: number, f: any) => t + Number(f.amount) - Number(f.paid_amount), 0);

  return (
    <div className={printable ? 'bg-white text-gray-800 rounded-2xl p-6' : ''}>
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
        const classAvg = avg(classGrades.filter((g: any) => g.class_id === c.id));
        return (
          <div key={c.id} className={box}>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h3 className={`${tt} font-semibold`}>{c.name}{c.subject ? ' · ' + c.subject : ''}</h3>
              {a10 != null && <div className={`text-sm ${mut}`}>Điểm TB: <b className="text-[#C8A14B] text-lg">{a10}</b>{classAvg != null ? ` / TB lớp ${classAvg}` : ''}</div>}
            </div>
            <p className={`text-xs ${mut} mb-4`}>GV: {c.teacher?.full_name || '—'} · {c.schedule || ''}</p>
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div>
                <div className={`text-[11px] uppercase tracking-wider ${mut} mb-2`}>Điểm các bài kiểm tra (/10)</div>
                <Bars max={10} refLine={classAvg}
                  items={cg.map((g: any) => ({
                    label: g.name,
                    value: Math.round(Number(g.score) / Number(g.max_score) * 100) / 10,
                    sub: `${GRADE_TYPES[g.type] || g.type} · ${fmtDate(g.date)}${g.comment ? ' · ' + g.comment : ''}`,
                  }))} />
              </div>
              <div>
                <div className={`text-[11px] uppercase tracking-wider ${mut} mb-2`}>Chuyên cần</div>
                <Donut segments={[
                  { value: count('present'), color: EMERALD, label: 'Có mặt' },
                  { value: count('late'), color: AMBER, label: 'Muộn' },
                  { value: count('excused'), color: SKY, label: 'Có phép' },
                  { value: count('absent'), color: RED, label: 'Vắng' },
                ].filter(x => x.value > 0)} />
              </div>
            </div>
            {cg.some((g: any) => g.comment) && (
              <div className={`mt-3 text-xs ${tx} space-y-1`}>
                <div className={`text-[11px] uppercase tracking-wider ${mut}`}>Nhận xét của giáo viên</div>
                {cg.filter((g: any) => g.comment).slice(-4).map((g: any) => (
                  <div key={g.id}>• <b>{g.name}</b> ({fmtDate(g.date)}): {g.comment}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className={box}>
        <h3 className={`${tt} font-semibold mb-2`}>✍️ WriteRight — IELTS Writing</h3>
        {!s.user_id ? (
          <p className={`text-sm ${mut}`}>Chưa liên kết tài khoản WriteRight (nhập email học viên trong hồ sơ để tự liên kết).</p>
        ) : writeright.length === 0 ? (
          <p className={`text-sm ${mut}`}>Chưa có bài chấm trên WriteRight.</p>
        ) : (
          <>
            <p className={`text-sm ${tx} mb-2`}>
              {writeright.length} bài đã chấm · Gần nhất: <b className="text-[#C8A14B]">{writeright[writeright.length - 1].overall_band}</b>
              {' '}· Cao nhất: <b className="text-[#C8A14B]">{Math.max(...writeright.map((w: any) => Number(w.overall_band)))}</b>
              {' '}· TA {writeright[writeright.length - 1].ta_band} / CC {writeright[writeright.length - 1].cc_band} / LR {writeright[writeright.length - 1].lr_band} / GRA {writeright[writeright.length - 1].gra_band}
            </p>
            <Trend max={9} width={420}
              points={writeright.map((w: any) => Number(w.overall_band))}
              labels={writeright.map((w: any) => fmtDate(w.created_at))} />
          </>
        )}
      </div>

      {fees.length > 0 && (
        <div className={box}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
            <h3 className={`${tt} font-semibold`}>💰 Học phí</h3>
            {feeDue > 0
              ? <span className="text-sm text-red-400 font-semibold">Còn phải thu: {fmtMoney(feeDue)}</span>
              : <span className="text-sm text-emerald-400 font-semibold">✓ Đã hoàn thành</span>}
          </div>
          <table className="w-full">
            <thead><tr>{['Nội dung', 'Số tiền', 'Đã thu', 'Hạn', 'Trạng thái'].map(hd =>
              <th key={hd} className={`text-left text-[10px] uppercase tracking-wider ${mut} py-1 pr-2`}>{hd}</th>)}</tr></thead>
            <tbody>
              {fees.map((f: any) => (
                <tr key={f.id} className={printable ? 'border-t border-gray-200' : 'border-t border-white/5'}>
                  <td className={`py-1.5 pr-2 text-xs ${tx}`}>{f.title}</td>
                  <td className={`py-1.5 pr-2 text-xs font-semibold ${tt}`}>{fmtMoney(Number(f.amount))}</td>
                  <td className={`py-1.5 pr-2 text-xs ${tx}`}>{fmtMoney(Number(f.paid_amount))}</td>
                  <td className={`py-1.5 pr-2 text-xs ${tx}`}>{fmtDate(f.due_date)}</td>
                  <td className="py-1.5 text-xs"><Badge map={FEE_STATUS} k={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {printable && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Báo cáo tạo tự động từ hệ thống UNICOACH — "Per te, ad astra"
        </p>
      )}
    </div>
  );
}
