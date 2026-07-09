'use client';
// UNICOACH BMS — Phòng họp & đặt phòng
import { useEffect, useState } from 'react';
import {
  BmsShell, supabase, useBmsUser, Modal, Field, inputCls,
  Th, Td, TableWrap, Empty, PageHead, btnPri, btnSec, btnSmDanger, btnSm, fmtDate, today,
} from '@/components/bms/ui';

function Inner() {
  const me = useBmsUser();
  const isAdmin = me.role === 'admin';
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [roomForm, setRoomForm] = useState<any | null>(null);
  const [bookForm, setBookForm] = useState<any | null>(null);

  async function load() {
    const [r, b] = await Promise.all([
      supabase.from('bms_rooms').select('*').order('name'),
      supabase.from('bms_bookings').select('*, bms_rooms(name), booker:profiles!bms_bookings_booked_by_fkey(full_name)')
        .gte('date', today()).order('date').order('start_time'),
    ]);
    setRooms(r.data || []);
    setBookings(b.data || []);
  }
  useEffect(() => { load(); }, []);

  return (
    <>
      <PageHead title="Phòng họp & Đặt phòng">
        {isAdmin && <button className={btnSec} onClick={() => setRoomForm({ capacity: 10 })}>+ Thêm phòng</button>}
        <button className={btnPri} onClick={() => setBookForm({ date: today(), start_time: '09:00', end_time: '10:00' })}>+ Đặt phòng</button>
      </PageHead>

      <h3 className="text-white text-sm font-semibold mb-2">Danh sách phòng</h3>
      {rooms.length === 0 ? <Empty msg="Chưa có phòng" /> : (
        <TableWrap>
          <thead><tr><Th>Phòng</Th><Th>Sức chứa</Th><Th>Thiết bị</Th><Th>{''}</Th></tr></thead>
          <tbody>
            {rooms.map(r => (
              <tr key={r.id} className="hover:bg-navy-700/30">
                <Td><b className="text-white">{r.name}</b></Td>
                <Td>{r.capacity} người</Td>
                <Td>{r.equipment || ''}</Td>
                <Td>{isAdmin && (
                  <div className="flex gap-1.5">
                    <button className={btnSm} onClick={() => setRoomForm(r)}>Sửa</button>
                    <button className={btnSmDanger} onClick={async () => { await supabase.from('bms_rooms').delete().eq('id', r.id); load(); }}>Xóa</button>
                  </div>
                )}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <h3 className="text-white text-sm font-semibold mb-2 mt-6">Lịch đặt phòng sắp tới</h3>
      {bookings.length === 0 ? <Empty msg="Chưa có lịch đặt phòng" /> : (
        <TableWrap>
          <thead><tr><Th>Ngày</Th><Th>Giờ</Th><Th>Phòng</Th><Th>Nội dung</Th><Th>Người đặt</Th><Th>{''}</Th></tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-navy-700/30">
                <Td>{fmtDate(b.date)}</Td>
                <Td>{String(b.start_time).slice(0, 5)}–{String(b.end_time).slice(0, 5)}</Td>
                <Td><b className="text-white">{b.bms_rooms?.name}</b></Td>
                <Td>{b.title}{b.purpose && <div className="text-xs text-navy-400">{b.purpose}</div>}</Td>
                <Td>{b.booker?.full_name || ''}</Td>
                <Td>{(isAdmin || b.booked_by === me.id) && (
                  <button className={btnSmDanger} onClick={async () => { await supabase.from('bms_bookings').delete().eq('id', b.id); load(); }}>Hủy</button>
                )}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {roomForm && (
        <Modal title={roomForm.id ? 'Sửa phòng' : 'Thêm phòng'} onClose={() => setRoomForm(null)}
          onSave={async () => {
            const p = { name: roomForm.name, capacity: Number(roomForm.capacity) || 10, equipment: roomForm.equipment || null };
            if (!p.name) throw new Error('Cần tên phòng');
            const r = roomForm.id
              ? await supabase.from('bms_rooms').update(p).eq('id', roomForm.id)
              : await supabase.from('bms_rooms').insert(p);
            if (r.error) throw new Error(r.error.message.includes('duplicate') ? 'Tên phòng đã tồn tại' : r.error.message);
            await load();
          }}>
          <Field label="Tên phòng *"><input className={inputCls} value={roomForm.name || ''} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} /></Field>
          <Field label="Sức chứa"><input type="number" className={inputCls} value={roomForm.capacity ?? 10} onChange={e => setRoomForm({ ...roomForm, capacity: e.target.value })} /></Field>
          <Field label="Thiết bị"><input className={inputCls} value={roomForm.equipment || ''} onChange={e => setRoomForm({ ...roomForm, equipment: e.target.value })} /></Field>
        </Modal>
      )}

      {bookForm && (
        <Modal title="Đặt phòng họp" onClose={() => setBookForm(null)} saveLabel="Đặt phòng"
          onSave={async () => {
            const f = bookForm;
            if (!f.room_id || !f.title) throw new Error('Cần chọn phòng và nội dung');
            if (f.end_time <= f.start_time) throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
            const r = await supabase.from('bms_bookings').insert({
              room_id: f.room_id, title: f.title, date: f.date, start_time: f.start_time,
              end_time: f.end_time, purpose: f.purpose || null, booked_by: me.id,
            });
            if (r.error) throw new Error(r.error.message.includes('Trùng lịch') ? 'Trùng lịch — phòng đã có người đặt khung giờ này' : r.error.message);
            await load();
          }}>
          <Field label="Phòng *">
            <select className={inputCls} value={bookForm.room_id || ''} onChange={e => setBookForm({ ...bookForm, room_id: e.target.value })}>
              <option value="">— Chọn phòng —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity} người)</option>)}
            </select>
          </Field>
          <Field label="Nội dung cuộc họp *"><input className={inputCls} value={bookForm.title || ''} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ngày *"><input type="date" className={inputCls} value={bookForm.date} onChange={e => setBookForm({ ...bookForm, date: e.target.value })} /></Field>
            <Field label="Bắt đầu *"><input type="time" className={inputCls} value={bookForm.start_time} onChange={e => setBookForm({ ...bookForm, start_time: e.target.value })} /></Field>
            <Field label="Kết thúc *"><input type="time" className={inputCls} value={bookForm.end_time} onChange={e => setBookForm({ ...bookForm, end_time: e.target.value })} /></Field>
          </div>
          <Field label="Mục đích / ghi chú"><textarea rows={2} className={inputCls} value={bookForm.purpose || ''} onChange={e => setBookForm({ ...bookForm, purpose: e.target.value })} /></Field>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell><Inner /></BmsShell>;
}
