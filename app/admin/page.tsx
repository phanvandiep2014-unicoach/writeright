'use client';
// UNICOACH BMS — Tổng quan
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BmsShell, supabase, fmtDate, Empty } from '@/components/bms/ui';

function Stat({ num, label }: { num: number | string; label: string }) {
  return (
    <div className="bg-navy-800/60 border border-navy-700 rounded-xl p-4">
      <div className="text-2xl font-bold text-brand-500">{num}</div>
      <div className="text-xs text-navy-400 mt-1">{label}</div>
    </div>
  );
}

function Inner() {
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [st, cl, tc, bk, gr] = await Promise.all([
        supabase.from('bms_students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('bms_classes').select('id', { count: 'exact', head: true }).in('status', ['open', 'running']),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['teacher', 'assistant']),
        supabase.from('bms_bookings').select('*, bms_rooms(name)').gte('date', new Date().toISOString().slice(0, 10)).order('date').order('start_time').limit(5),
        supabase.from('bms_grades').select('*, bms_students(name), bms_classes(name)').order('created_at', { ascending: false }).limit(8),
      ]);
      setStats({ students: st.count ?? 0, classes: cl.count ?? 0, staff: tc.count ?? 0 });
      setBookings(bk.data || []);
      setGrades(gr.data || []);
    })();
  }, []);

  return (
    <>
      <h1 className="text-xl text-white font-semibold mb-5">Tổng quan trung tâm</h1>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat num={stats.students} label="Học viên đang học" />
          <Stat num={stats.classes} label="Lớp đang hoạt động" />
          <Stat num={stats.staff} label="GV & Trợ giảng" />
          <Stat num={bookings.length} label="Lịch họp sắp tới" />
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-navy-800/60 border border-navy-700 rounded-xl p-4">
          <h3 className="text-white text-sm font-semibold mb-3">Điểm mới nhập</h3>
          {grades.length === 0 ? <Empty msg="Chưa có dữ liệu" /> : (
            <ul className="space-y-2">
              {grades.map(g => (
                <li key={g.id} className="text-sm text-navy-100 flex justify-between gap-2">
                  <span>{g.bms_students?.name} · <span className="text-navy-400">{g.name} ({g.bms_classes?.name})</span></span>
                  <b className="text-brand-500">{g.score}/{g.max_score}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-navy-800/60 border border-navy-700 rounded-xl p-4">
          <h3 className="text-white text-sm font-semibold mb-3">Lịch họp sắp tới</h3>
          {bookings.length === 0 ? <Empty msg="Không có lịch họp" /> : (
            <ul className="space-y-2">
              {bookings.map(b => (
                <li key={b.id} className="text-sm text-navy-100">
                  <b>{fmtDate(b.date)}</b> {String(b.start_time).slice(0, 5)}–{String(b.end_time).slice(0, 5)} · {b.bms_rooms?.name} — {b.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-6 text-sm text-navy-400">
        Mẹo: gán vai trò cho tài khoản Google mới trong <Link href="/admin/students" className="text-brand-500 underline">Học viên</Link> (phụ huynh tự liên kết qua email) hoặc nhờ admin cập nhật role trong Supabase.
      </div>
    </>
  );
}

export default function Page() {
  return <BmsShell><Inner /></BmsShell>;
}
