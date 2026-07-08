'use client';
// UNICOACH BMS — Quản lý lớp học
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BmsShell, supabase, useBmsUser, Badge, Modal, Field, inputCls,
  Th, Td, TableWrap, Empty, PageHead, btnPri, btnSm, btnSmDanger, CLASS_STATUS,
} from '@/components/bms/ui';

function Inner() {
  const me = useBmsUser();
  const isAdmin = me.role === 'admin';
  const [rows, setRows] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);

  async function load() {
    let query = supabase.from('bms_classes')
      .select('*, teacher:profiles!bms_classes_teacher_id_fkey(full_name), assistant:profiles!bms_classes_assistant_id_fkey(full_name), bms_enrollments(count)')
      .order('code');
    const { data, error } = await query;
    if (!error) setRows(data || []);
    else { // fallback nếu tên FK khác
      const { data: d2 } = await supabase.from('bms_classes').select('*').order('code');
      setRows(d2 || []);
    }
    if (isAdmin) {
      const { data: st } = await supabase.from('profiles').select('id, full_name, role').in('role', ['teacher', 'assistant']);
      setStaff(st || []);
    }
  }
  useEffect(() => { load(); }, []);

  const visible = isAdmin ? rows : rows.filter(c => c.teacher_id === me.id || c.assistant_id === me.id);
  function set(k: string, v: any) { setEditing((e: any) => ({ ...e, [k]: v })); }

  async function save() {
    const e = editing!;
    if (!e.code || !e.name) throw new Error('Cần mã và tên lớp');
    const payload: any = {
      code: e.code, name: e.name, subject: e.subject || null,
      teacher_id: e.teacher_id || null, assistant_id: e.assistant_id || null,
      schedule: e.schedule || null, room: e.room || null,
      start_date: e.start_date || null, end_date: e.end_date || null,
      max_students: Number(e.max_students) || 20, status: e.status || 'open',
    };
    const r = e.id
      ? await supabase.from('bms_classes').update(payload).eq('id', e.id)
      : await supabase.from('bms_classes').insert(payload);
    if (r.error) throw new Error(r.error.message.includes('duplicate') ? 'Mã lớp đã tồn tại' : r.error.message);
    await load();
  }

  return (
    <>
      <PageHead title={isAdmin ? 'Quản lý lớp học' : 'Lớp của tôi'}>
        {isAdmin && <button className={btnPri} onClick={() => setEditing({ status: 'open', max_students: 20 })}>+ Thêm lớp</button>}
      </PageHead>
      {visible.length === 0 ? <Empty msg="Chưa có lớp học" /> : (
        <TableWrap>
          <thead><tr><Th>Mã</Th><Th>Tên lớp</Th><Th>Giáo viên</Th><Th>Trợ giảng</Th><Th>Lịch học</Th><Th>Sĩ số</Th><Th>Trạng thái</Th><Th>{''}</Th></tr></thead>
          <tbody>
            {visible.map(c => (
              <tr key={c.id} className="hover:bg-navy-700/30">
                <Td className="font-mono">{c.code}</Td>
                <Td><Link href={`/admin/classes/${c.id}`} className="text-white font-semibold hover:text-brand-500">{c.name}</Link></Td>
                <Td>{c.teacher?.full_name || '—'}</Td>
                <Td>{c.assistant?.full_name || '—'}</Td>
                <Td>{c.schedule || ''}</Td>
                <Td>{c.bms_enrollments?.[0]?.count ?? 0}/{c.max_students}</Td>
                <Td><Badge map={CLASS_STATUS} k={c.status} /></Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Link href={`/admin/classes/${c.id}`} className={btnSm}>Mở</Link>
                    {isAdmin && <button className={btnSm} onClick={() => setEditing(c)}>Sửa</button>}
                    {isAdmin && <button className={btnSmDanger} onClick={() => setConfirmDel(c)}>Xóa</button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {editing && (
        <Modal title={editing.id ? 'Sửa lớp' : 'Thêm lớp'} wide onClose={() => setEditing(null)} onSave={save}>
          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Mã lớp *"><input className={inputCls} value={editing.code || ''} onChange={e => set('code', e.target.value)} /></Field>
            <Field label="Tên lớp *"><input className={inputCls} value={editing.name || ''} onChange={e => set('name', e.target.value)} /></Field>
            <Field label="Môn học"><input className={inputCls} placeholder="IELTS, Toán…" value={editing.subject || ''} onChange={e => set('subject', e.target.value)} /></Field>
            <Field label="Trạng thái">
              <select className={inputCls} value={editing.status || 'open'} onChange={e => set('status', e.target.value)}>
                {Object.entries(CLASS_STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Giáo viên">
              <select className={inputCls} value={editing.teacher_id || ''} onChange={e => set('teacher_id', e.target.value)}>
                <option value="">—</option>
                {staff.filter(s => s.role === 'teacher').map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </Field>
            <Field label="Trợ giảng">
              <select className={inputCls} value={editing.assistant_id || ''} onChange={e => set('assistant_id', e.target.value)}>
                <option value="">—</option>
                {staff.filter(s => s.role === 'assistant').map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </Field>
            <Field label="Lịch học"><input className={inputCls} placeholder="T2-T4-T6 18:00-19:30" value={editing.schedule || ''} onChange={e => set('schedule', e.target.value)} /></Field>
            <Field label="Phòng học"><input className={inputCls} value={editing.room || ''} onChange={e => set('room', e.target.value)} /></Field>
            <Field label="Ngày bắt đầu"><input type="date" className={inputCls} value={editing.start_date || ''} onChange={e => set('start_date', e.target.value)} /></Field>
            <Field label="Ngày kết thúc"><input type="date" className={inputCls} value={editing.end_date || ''} onChange={e => set('end_date', e.target.value)} /></Field>
            <Field label="Sĩ số tối đa"><input type="number" className={inputCls} value={editing.max_students ?? 20} onChange={e => set('max_students', e.target.value)} /></Field>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="Xác nhận xóa" onClose={() => setConfirmDel(null)} saveLabel="Xóa"
          onSave={async () => {
            const r = await supabase.from('bms_classes').delete().eq('id', confirmDel.id);
            if (r.error) throw new Error(r.error.message);
            await load();
          }}>
          <p className="text-navy-100 text-sm">Xóa lớp <b className="text-white">{confirmDel.name}</b>? Điểm số và điểm danh của lớp sẽ bị xóa.</p>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell><Inner /></BmsShell>;
}
