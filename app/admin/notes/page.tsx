'use client';
// UNICOACH BMS — Biên bản họp
import { useEffect, useState } from 'react';
import {
  BmsShell, supabase, useBmsUser, Modal, Field, inputCls,
  Empty, PageHead, btnPri, btnSm, btnSmDanger, fmtDate, today,
} from '@/components/bms/ui';

function Inner() {
  const me = useBmsUser();
  const isAdmin = me.role === 'admin';
  const [notes, setNotes] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const { data } = await supabase.from('bms_meeting_notes')
      .select('*, author:profiles!bms_meeting_notes_created_by_fkey(full_name)')
      .order('date', { ascending: false });
    setNotes(data || []);
  }
  useEffect(() => { load(); }, []);

  function set(k: string, v: any) { setEditing((e: any) => ({ ...e, [k]: v })); }
  async function save() {
    const e = editing!;
    if (!e.title || !e.date) throw new Error('Cần tiêu đề và ngày họp');
    const payload: any = {
      title: e.title, date: e.date, attendees: e.attendees || null,
      content: e.content || null, action_items: e.action_items || null,
    };
    const r = e.id
      ? await supabase.from('bms_meeting_notes').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', e.id)
      : await supabase.from('bms_meeting_notes').insert({ ...payload, created_by: me.id });
    if (r.error) throw new Error(r.error.message);
    await load();
  }

  return (
    <>
      <PageHead title="Biên bản họp (Meeting Notes)">
        <button className={btnPri} onClick={() => setEditing({ date: today() })}>+ Biên bản mới</button>
      </PageHead>
      {notes.length === 0 ? <Empty msg="Chưa có biên bản họp" /> : notes.map(n => (
        <div key={n.id} className="bg-navy-800/60 border border-navy-700 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <h3 className="text-white font-semibold">{n.title}</h3>
              <p className="text-xs text-navy-400 mt-1">
                {fmtDate(n.date)} · Người tạo: {n.author?.full_name || '—'}{n.attendees ? ' · Tham dự: ' + n.attendees : ''}
              </p>
            </div>
            <div className="flex gap-1.5">
              {(isAdmin || n.created_by === me.id) && <>
                <button className={btnSm} onClick={() => setEditing(n)}>Sửa</button>
                <button className={btnSmDanger} onClick={async () => { await supabase.from('bms_meeting_notes').delete().eq('id', n.id); load(); }}>Xóa</button>
              </>}
            </div>
          </div>
          {n.content && <div className="text-sm text-navy-100 whitespace-pre-wrap mt-3">{n.content}</div>}
          {n.action_items && (
            <div className="mt-3 bg-brand-500/10 border border-brand-500/30 rounded-lg p-3 text-sm text-navy-100 whitespace-pre-wrap">
              <b className="text-brand-500">✅ Việc cần làm:</b>{'\n' + n.action_items}
            </div>
          )}
        </div>
      ))}

      {editing && (
        <Modal title={editing.id ? 'Sửa biên bản' : 'Biên bản họp mới'} wide onClose={() => setEditing(null)} onSave={save}>
          <Field label="Tiêu đề *"><input className={inputCls} value={editing.title || ''} onChange={e => set('title', e.target.value)} /></Field>
          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Ngày họp *"><input type="date" className={inputCls} value={editing.date || today()} onChange={e => set('date', e.target.value)} /></Field>
            <Field label="Người tham dự"><input className={inputCls} value={editing.attendees || ''} onChange={e => set('attendees', e.target.value)} /></Field>
          </div>
          <Field label="Nội dung"><textarea rows={7} className={inputCls} value={editing.content || ''} onChange={e => set('content', e.target.value)} /></Field>
          <Field label="Việc cần làm (action items)"><textarea rows={3} className={inputCls} value={editing.action_items || ''} onChange={e => set('action_items', e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell><Inner /></BmsShell>;
}
