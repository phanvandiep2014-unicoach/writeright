'use client';
// UNICOACH BMS — Theo dõi học phí
import { useEffect, useState } from 'react';
import {
  BmsShell, supabase, useBmsUser, Badge, Modal, Field, inputCls, Card,
  Th, Td, TableWrap, Empty, PageHead, btnPri, btnSm, btnSmDanger, FEE_STATUS, fmtDate, today,
} from '@/components/bms/ui';
import { fmtMoney } from '@/components/bms/charts';

function Inner() {
  const me = useBmsUser();
  const [rows, setRows] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [paying, setPaying] = useState<any | null>(null);

  async function load() {
    const [f, s, c] = await Promise.all([
      supabase.from('bms_fees').select('*, bms_students(code, name), bms_classes(name)').order('due_date', { ascending: true }),
      supabase.from('bms_students').select('id, code, name').eq('status', 'active').order('code'),
      supabase.from('bms_classes').select('id, name').order('code'),
    ]);
    setRows(f.data || []); setStudents(s.data || []); setClasses(c.data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = rows
    .filter(r => !filter || r.status === filter)
    .filter(r => (r.title + (r.bms_students?.name || '') + (r.bms_students?.code || '')).toLowerCase().includes(q.toLowerCase()));

  const sum = (st?: string) => rows.filter(r => !st || r.status === st).reduce((t, r) => t + Number(r.amount) - Number(r.paid_amount), 0);
  const collected = rows.reduce((t, r) => t + Number(r.paid_amount), 0);
  const overdue = rows.filter(r => r.status !== 'paid' && r.due_date && r.due_date < today());

  function set(k: string, v: any) { setEditing((e: any) => ({ ...e, [k]: v })); }
  async function save() {
    const e = editing!;
    if (!e.student_id || !e.title || !e.amount) throw new Error('Cần học viên, nội dung và số tiền');
    const payload: any = {
      student_id: e.student_id, class_id: e.class_id || null, title: e.title,
      amount: Number(e.amount), due_date: e.due_date || null, note: e.note || null,
    };
    const r = e.id
      ? await supabase.from('bms_fees').update(payload).eq('id', e.id)
      : await supabase.from('bms_fees').insert({ ...payload, created_by: me.id });
    if (r.error) throw new Error(r.error.message);
    await load();
  }

  return (
    <>
      <PageHead title="Theo dõi học phí">
        <button className={btnPri} onClick={() => setEditing({ due_date: today() })}>+ Tạo khoản thu</button>
      </PageHead>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card><div className="text-2xl font-bold text-emerald-400">{fmtMoney(collected)}</div><div className="text-xs text-navy-400 mt-1">Đã thu</div></Card>
        <Card><div className="text-2xl font-bold text-red-400">{fmtMoney(sum('unpaid') + sum('partial'))}</div><div className="text-xs text-navy-400 mt-1">Còn phải thu</div></Card>
        <Card><div className="text-2xl font-bold text-amber-400">{overdue.length}</div><div className="text-xs text-navy-400 mt-1">Khoản quá hạn</div></Card>
        <Card><div className="text-2xl font-bold text-white">{rows.length}</div><div className="text-xs text-navy-400 mt-1">Tổng khoản thu</div></Card>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input className={inputCls + ' max-w-xs'} placeholder="🔍 Tìm học viên, nội dung…" value={q} onChange={e => setQ(e.target.value)} />
        {['', 'unpaid', 'partial', 'paid'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs transition-all ${filter === s ? 'bg-brand-500/15 text-brand-500 font-semibold' : 'text-navy-400 hover:text-white border border-white/10'}`}>
            {s === '' ? 'Tất cả' : FEE_STATUS[s][0]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty msg="Chưa có khoản thu nào" /> : (
        <TableWrap>
          <thead><tr><Th>Học viên</Th><Th>Nội dung</Th><Th>Số tiền</Th><Th>Đã thu</Th><Th>Hạn thu</Th><Th>Trạng thái</Th><Th>{''}</Th></tr></thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="hover:bg-white/[.03]">
                <Td><b className="text-white">{f.bms_students?.name}</b><div className="text-xs text-navy-400 font-mono">{f.bms_students?.code}</div></Td>
                <Td>{f.title}{f.bms_classes?.name && <div className="text-xs text-navy-400">{f.bms_classes.name}</div>}</Td>
                <Td><b className="text-white">{fmtMoney(Number(f.amount))}</b></Td>
                <Td className={Number(f.paid_amount) > 0 ? 'text-emerald-400' : ''}>{fmtMoney(Number(f.paid_amount))}</Td>
                <Td className={f.status !== 'paid' && f.due_date && f.due_date < today() ? 'text-red-400 font-semibold' : ''}>{fmtDate(f.due_date)}</Td>
                <Td><Badge map={FEE_STATUS} k={f.status} /></Td>
                <Td>
                  <div className="flex gap-1.5 flex-wrap">
                    {f.status !== 'paid' && <button className={btnSm + ' !border-emerald-500/40 !text-emerald-400'} onClick={() => setPaying({ ...f, add: Number(f.amount) - Number(f.paid_amount), method: 'Chuyển khoản' })}>Thu tiền</button>}
                    <button className={btnSm} onClick={() => setEditing(f)}>Sửa</button>
                    <button className={btnSmDanger} onClick={async () => { await supabase.from('bms_fees').delete().eq('id', f.id); load(); }}>Xóa</button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {editing && (
        <Modal title={editing.id ? 'Sửa khoản thu' : 'Tạo khoản thu'} onClose={() => setEditing(null)} onSave={save}>
          <Field label="Học viên *">
            <select className={inputCls} value={editing.student_id || ''} onChange={e => set('student_id', e.target.value)}>
              <option value="">— Chọn —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </select>
          </Field>
          <Field label="Nội dung *"><input className={inputCls} placeholder="Học phí IELTS Foundation tháng 7/2026" value={editing.title || ''} onChange={e => set('title', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền (đ) *"><input type="number" step="1000" className={inputCls} value={editing.amount ?? ''} onChange={e => set('amount', e.target.value)} /></Field>
            <Field label="Hạn thu"><input type="date" className={inputCls} value={editing.due_date || ''} onChange={e => set('due_date', e.target.value)} /></Field>
          </div>
          <Field label="Lớp (tùy chọn)">
            <select className={inputCls} value={editing.class_id || ''} onChange={e => set('class_id', e.target.value)}>
              <option value="">—</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Ghi chú"><input className={inputCls} value={editing.note || ''} onChange={e => set('note', e.target.value)} /></Field>
        </Modal>
      )}

      {paying && (
        <Modal title={`Thu tiền — ${paying.bms_students?.name}`} onClose={() => setPaying(null)} saveLabel="Xác nhận thu"
          onSave={async () => {
            const add = Number(paying.add);
            if (!add || add <= 0) throw new Error('Số tiền thu không hợp lệ');
            const r = await supabase.from('bms_fees').update({
              paid_amount: Number(paying.paid_amount) + add,
              method: paying.method || null,
            }).eq('id', paying.id);
            if (r.error) throw new Error(r.error.message);
            await load();
          }}>
          <p className="text-sm text-navy-100 mb-3">{paying.title} — còn thiếu <b className="text-red-400">{fmtMoney(Number(paying.amount) - Number(paying.paid_amount))}</b></p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền thu (đ)"><input type="number" step="1000" className={inputCls} value={paying.add} onChange={e => setPaying({ ...paying, add: e.target.value })} /></Field>
            <Field label="Hình thức">
              <select className={inputCls} value={paying.method} onChange={e => setPaying({ ...paying, method: e.target.value })}>
                <option>Chuyển khoản</option><option>Tiền mặt</option><option>PayOS</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell allow={['admin']}><Inner /></BmsShell>;
}
