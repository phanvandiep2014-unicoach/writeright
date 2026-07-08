'use client';
// UNICOACH BMS — Quản lý học viên
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BmsShell, supabase, useBmsUser, Badge, Modal, Field, inputCls,
  Th, Td, TableWrap, Empty, PageHead, btnPri, btnSm, btnSmDanger,
  STUDENT_STATUS, fmtDate,
} from '@/components/bms/ui';

type Student = any;

function Inner() {
  const me = useBmsUser();
  const isAdmin = me.role === 'admin';
  const [rows, setRows] = useState<Student[]>([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmDel, setConfirmDel] = useState<Student | null>(null);

  async function load() {
    const { data } = await supabase.from('bms_students').select('*').order('code');
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => (r.name + r.code + (r.parent_name || '') + (r.email || '')).toLowerCase().includes(q.toLowerCase()));

  function set(k: string, v: any) { setEditing((e: any) => ({ ...e, [k]: v })); }

  async function save() {
    const e = editing!;
    if (!e.code || !e.name) throw new Error('Cần mã và tên học viên');
    const payload: any = {
      code: e.code, name: e.name, dob: e.dob || null, gender: e.gender || null, phone: e.phone || null,
      email: e.email ? e.email.toLowerCase() : null, address: e.address || null,
      parent_name: e.parent_name || null, parent_phone: e.parent_phone || null,
      parent_email: e.parent_email ? e.parent_email.toLowerCase() : null,
      status: e.status || 'active', joined_at: e.joined_at || null, notes: e.notes || null,
    };
    const r = e.id
      ? await supabase.from('bms_students').update(payload).eq('id', e.id)
      : await supabase.from('bms_students').insert(payload);
    if (r.error) throw new Error(r.error.message.includes('duplicate') ? 'Mã học viên đã tồn tại' : r.error.message);
    await load();
  }

  return (
    <>
      <PageHead title="Quản lý học viên">
        {isAdmin && <button className={btnPri} onClick={() => setEditing({ status: 'active' })}>+ Thêm học viên</button>}
      </PageHead>
      <input className={inputCls + ' max-w-sm mb-4'} placeholder="🔍 Tìm theo tên, mã, email, phụ huynh…" value={q} onChange={e => setQ(e.target.value)} />
      {filtered.length === 0 ? <Empty msg="Chưa có học viên" /> : (
        <TableWrap>
          <thead><tr><Th>Mã</Th><Th>Họ tên</Th><Th>Ngày sinh</Th><Th>Phụ huynh</Th><Th>Liên kết</Th><Th>Trạng thái</Th><Th>{''}</Th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-navy-700/30">
                <Td className="font-mono">{s.code}</Td>
                <Td><b className="text-white">{s.name}</b>{s.email && <div className="text-xs text-navy-400">{s.email}</div>}</Td>
                <Td>{fmtDate(s.dob)}</Td>
                <Td>{s.parent_name || ''}<div className="text-xs text-navy-400">{s.parent_phone || ''}{s.parent_email ? ' · ' + s.parent_email : ''}</div></Td>
                <Td>
                  <span className={`text-xs ${s.user_id ? 'text-emerald-400' : 'text-navy-500'}`}>HV {s.user_id ? '✓' : '—'}</span>{' '}
                  <span className={`text-xs ${s.parent_user_id ? 'text-emerald-400' : 'text-navy-500'}`}>PH {s.parent_user_id ? '✓' : '—'}</span>
                </Td>
                <Td><Badge map={STUDENT_STATUS} k={s.status} /></Td>
                <Td>
                  <div className="flex gap-1.5 flex-wrap">
                    <Link href={`/admin/reports?sid=${s.id}`} className={btnSm}>Báo cáo</Link>
                    {isAdmin && <button className={btnSm} onClick={() => setEditing(s)}>Sửa</button>}
                    {isAdmin && <button className={btnSmDanger} onClick={() => setConfirmDel(s)}>Xóa</button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {editing && (
        <Modal title={editing.id ? 'Sửa học viên' : 'Thêm học viên'} wide onClose={() => setEditing(null)} onSave={save}>
          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Mã học viên *"><input className={inputCls} value={editing.code || ''} onChange={e => set('code', e.target.value)} /></Field>
            <Field label="Họ tên *"><input className={inputCls} value={editing.name || ''} onChange={e => set('name', e.target.value)} /></Field>
            <Field label="Ngày sinh"><input type="date" className={inputCls} value={editing.dob || ''} onChange={e => set('dob', e.target.value)} /></Field>
            <Field label="Giới tính">
              <select className={inputCls} value={editing.gender || ''} onChange={e => set('gender', e.target.value)}>
                <option value="">—</option><option>Nam</option><option>Nữ</option>
              </select>
            </Field>
            <Field label="SĐT học viên"><input className={inputCls} value={editing.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
            <Field label="Email học viên (tài khoản WriteRight)"><input className={inputCls} placeholder="hocvien@gmail.com" value={editing.email || ''} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Tên phụ huynh"><input className={inputCls} value={editing.parent_name || ''} onChange={e => set('parent_name', e.target.value)} /></Field>
            <Field label="SĐT phụ huynh"><input className={inputCls} value={editing.parent_phone || ''} onChange={e => set('parent_phone', e.target.value)} /></Field>
            <Field label="Email phụ huynh (đăng nhập Google để xem báo cáo)"><input className={inputCls} placeholder="phuhuynh@gmail.com" value={editing.parent_email || ''} onChange={e => set('parent_email', e.target.value)} /></Field>
            <Field label="Ngày nhập học"><input type="date" className={inputCls} value={editing.joined_at || ''} onChange={e => set('joined_at', e.target.value)} /></Field>
            <Field label="Trạng thái">
              <select className={inputCls} value={editing.status || 'active'} onChange={e => set('status', e.target.value)}>
                {Object.entries(STUDENT_STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Địa chỉ"><input className={inputCls} value={editing.address || ''} onChange={e => set('address', e.target.value)} /></Field>
          </div>
          <Field label="Ghi chú"><textarea rows={2} className={inputCls} value={editing.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
          <p className="text-xs text-navy-400">💡 Khi phụ huynh/học viên đăng nhập Google bằng đúng email trên, hệ thống tự liên kết tài khoản (cột "Liên kết").</p>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="Xác nhận xóa" onClose={() => setConfirmDel(null)} saveLabel="Xóa"
          onSave={async () => {
            const r = await supabase.from('bms_students').delete().eq('id', confirmDel.id);
            if (r.error) throw new Error(r.error.message);
            await load();
          }}>
          <p className="text-navy-100 text-sm">Xóa học viên <b className="text-white">{confirmDel.name}</b>? Toàn bộ điểm số, điểm danh, ghi danh sẽ bị xóa.</p>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell><Inner /></BmsShell>;
}
