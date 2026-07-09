'use client';
// UNICOACH BMS — Lịch tuần các lớp + sĩ số từng buổi
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BmsShell, supabase, Card, Empty, PageHead, DAY_NAMES, btnSec } from '@/components/bms/ui';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h → 21h
const COLORS = ['#C8A14B', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#facc15'];

function mins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function Inner() {
  const [classes, setClasses] = useState<any[]>([]);
  const [att, setAtt] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data: cls } = await supabase.from('bms_classes')
        .select('*, teacher:profiles!bms_classes_teacher_id_fkey(full_name), bms_enrollments(count)')
        .in('status', ['open', 'running']);
      setClasses(cls || []);
      const { data: a } = await supabase.from('bms_attendance').select('class_id, date, status');
      setAtt(a || []);
    })();
  }, []);

  const scheduled = classes.filter(c => c.schedule_days && c.schedule_start && c.schedule_end);
  const unscheduled = classes.filter(c => !(c.schedule_days && c.schedule_start && c.schedule_end));

  // Sĩ số từng buổi của lớp đang chọn
  const sessions = sel ? Object.entries(
    att.filter(a => a.class_id === sel.id).reduce((m: any, a) => {
      (m[a.date] ??= { present: 0, absent: 0, late: 0, excused: 0 })[a.status]++;
      return m;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b)) as [string, any][] : [];

  return (
    <>
      <PageHead title="Lịch tuần & sĩ số buổi học" />
      {scheduled.length === 0 && (
        <Card className="mb-4">
          <p className="text-sm text-navy-100">Chưa có lớp nào khai báo lịch cấu trúc. Vào <Link href="/admin/classes" className="text-brand-500 underline">Lớp học → Sửa</Link> và chọn <b>Ngày học trong tuần + giờ bắt đầu/kết thúc</b> để lớp hiện trên lịch.</p>
        </Card>
      )}

      <div className="bg-navy-800/50 border border-white/5 rounded-2xl overflow-x-auto mb-6">
        <div className="min-w-[860px] grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div />
          {DAY_NAMES.slice(1).map(d => (
            <div key={d} className="text-center text-[11px] uppercase tracking-wider text-navy-400 py-2 border-b border-white/5">{d}</div>
          ))}
          {/* Lưới giờ */}
          <div className="relative" style={{ height: HOURS.length * 44 }}>
            {HOURS.map((h, i) => (
              <div key={h} className="absolute right-1 text-[10px] text-navy-500" style={{ top: i * 44 - 6 }}>{h}:00</div>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, di) => di + 1).map(day => (
            <div key={day} className="relative border-l border-white/5" style={{ height: HOURS.length * 44 }}>
              {HOURS.map((_, i) => <div key={i} className="absolute w-full border-t border-white/[.04]" style={{ top: i * 44 }} />)}
              {scheduled.filter(c => c.schedule_days.split(',').map(Number).includes(day)).map((c, ci) => {
                const s = mins(String(c.schedule_start)), e = mins(String(c.schedule_end));
                const top = ((s - 7 * 60) / 60) * 44, h = Math.max(30, ((e - s) / 60) * 44);
                const color = COLORS[classes.indexOf(c) % COLORS.length];
                return (
                  <button key={c.id + day} onClick={() => setSel(c)}
                    className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left hover:scale-[1.03] hover:z-10 transition-transform"
                    style={{ top, height: h, background: color + '22', borderLeft: `3px solid ${color}` }}>
                    <div className="text-[11px] font-semibold text-white truncate">{c.name}</div>
                    <div className="text-[9px] text-navy-300">{String(c.schedule_start).slice(0, 5)}–{String(c.schedule_end).slice(0, 5)} · {c.bms_enrollments?.[0]?.count ?? 0} HV</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <p className="text-xs text-navy-400 mb-6">Chưa lên lịch: {unscheduled.map(c => c.name).join(', ')}</p>
      )}

      {sel && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h3 className="text-white font-semibold">Sĩ số từng buổi — {sel.name}</h3>
            <div className="flex gap-2">
              <Link href={`/admin/classes/${sel.id}`} className={btnSec}>Mở lớp</Link>
              <button className={btnSec} onClick={() => setSel(null)}>Đóng</button>
            </div>
          </div>
          {sessions.length === 0 ? <Empty msg="Chưa có buổi điểm danh nào" /> : (
            <div className="flex gap-2 items-end overflow-x-auto pb-2">
              {sessions.map(([date, s]) => {
                const total = s.present + s.absent + s.late + s.excused;
                const H = 110;
                return (
                  <div key={date} className="flex flex-col items-center gap-1 min-w-[46px] group">
                    <div className="text-[10px] text-navy-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      ✓{s.present} ✗{s.absent}{s.late ? ` M${s.late}` : ''}{s.excused ? ` P${s.excused}` : ''}
                    </div>
                    <div className="w-8 rounded-lg overflow-hidden flex flex-col-reverse" style={{ height: H }}>
                      <div style={{ height: (s.present / total) * H, background: '#34d399' }} title={`Có mặt: ${s.present}`} />
                      <div style={{ height: (s.late / total) * H, background: '#fbbf24' }} title={`Muộn: ${s.late}`} />
                      <div style={{ height: (s.excused / total) * H, background: '#38bdf8' }} title={`Có phép: ${s.excused}`} />
                      <div style={{ height: (s.absent / total) * H, background: '#f87171' }} title={`Vắng: ${s.absent}`} />
                    </div>
                    <div className="text-[9px] text-navy-400">{date.slice(8, 10)}/{date.slice(5, 7)}</div>
                    <div className="text-[10px] font-semibold text-white">{s.present}/{total}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-3 mt-2 text-[10px] text-navy-400">
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#34d399' }} />Có mặt</span>
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#fbbf24' }} />Muộn</span>
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#38bdf8' }} />Có phép</span>
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#f87171' }} />Vắng</span>
          </div>
        </Card>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell><Inner /></BmsShell>;
}
