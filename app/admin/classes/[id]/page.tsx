'use client';
// UNICOACH BMS — Chi tiết lớp: học viên / điểm danh / điểm số
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BmsShell, supabase, useBmsUser, Badge, Modal, Field, inputCls,
  Th, Td, TableWrap, Empty, PageHead, btnPri, btnSec, btnSm, btnSmDanger,
  CLASS_STATUS, ATT_STATUS, GRADE_TYPES, fmtDate, today,
} from '@/components/bms/ui';

function Inner() {
  const { id } = useParams<{ id: string }>();
  const me = useBmsUser();
  const isAdmin = me.role === 'admin';
  const [cls, setCls] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [tab, setTab] = useState<'students' | 'attendance' | 'grades'>('students');
  const canEdit = isAdmin || cls?.teacher_id === me.id || cls?.assistant_id === me.id;

  async function load() {
    const { data: c } = await supabase.from('bms_classes')
      .select('*, teacher:profiles!bms_classes_teacher_id_fkey(full_name), assistant:profiles!bms_classes_assistant_id_fkey(full_name)')
      .eq('id', id).single();
    setCls(c);
    const { data: en } = await supabase.from('bms_enrollments')
      .select('id, status, bms_students(*)').eq('class_id', id);
    setStudents((en || []).map((e: any) => ({ ...e.bms_students, enrollment_id: e.id })).sort((a, b) => a.name.localeCompare(b.name, 'vi')));
  }
  useEffect(() => { load(); }, [id]);

  if (!cls) return <div className="text-navy-400 font-mono">Đang tải…</div>;

  return (
    <>
      <PageHead title={`${cls.name} (${cls.code})`}>
        <Link href="/admin/classes" className={btnSec}>← Quay lại</Link>
      </PageHead>
      <p className="text-sm text-navy-400 mb-4">
        GV: {cls.teacher?.full_name || '—'} · TG: {cls.assistant?.full_name || '—'} · {cls.schedule || ''} · Phòng {cls.room || '—'} · <Badge map={CLASS_STATUS} k={cls.status} />
      </p>
      <div className="flex gap-1 border-b border-navy-700 mb-5">
        {([['students', 'Học viên'], ['attendance', 'Điểm danh'], ['grades', 'Điểm số']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 ${tab === k ? 'text-brand-500 border-brand-500' : 'text-navy-400 border-transparent hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'students' && <StudentsTab classId={id} students={students} isAdmin={isAdmin} reload={load} />}
      {tab === 'attendance' && <AttendanceTab classId={id} students={students} canEdit={canEdit} meId={me.id} />}
      {tab === 'grades' && <GradesTab classId={id} students={students} canEdit={canEdit} meId={me.id} isTeacher={isAdmin || cls.teacher_id === me.id} />}
    </>
  );
}

function StudentsTab({ classId, students, isAdmin, reload }: any) {
  const [all, setAll] = useState<any[]>([]);
  const [sel, setSel] = useState('');
  useEffect(() => {
    if (isAdmin) supabase.from('bms_students').select('id, code, name').eq('status', 'active').order('code')
      .then(({ data }) => setAll(data || []));
  }, [isAdmin]);
  const notIn = all.filter(a => !students.some((s: any) => s.id === a.id));

  return (
    <>
      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <select className={inputCls + ' max-w-xs'} value={sel} onChange={e => setSel(e.target.value)}>
            <option value="">— Chọn học viên để ghi danh —</option>
            {notIn.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
          <button className={btnPri} onClick={async () => {
            if (!sel) return;
            const r = await supabase.from('bms_enrollments').insert({ class_id: classId, student_id: sel });
            if (!r.error) { setSel(''); reload(); }
          }}>+ Ghi danh</button>
        </div>
      )}
      {students.length === 0 ? <Empty msg="Lớp chưa có học viên" /> : (
        <TableWrap>
          <thead><tr><Th>Mã</Th><Th>Họ tên</Th><Th>Phụ huynh</Th><Th>SĐT PH</Th><Th>{''}</Th></tr></thead>
          <tbody>
            {students.map((s: any) => (
              <tr key={s.id} className="hover:bg-navy-700/30">
                <Td className="font-mono">{s.code}</Td>
                <Td><b className="text-white">{s.name}</b></Td>
                <Td>{s.parent_name || ''}</Td>
                <Td>{s.parent_phone || ''}</Td>
                <Td>{isAdmin && (
                  <button className={btnSmDanger} onClick={async () => {
                    await supabase.from('bms_enrollments').delete().eq('id', s.enrollment_id);
                    reload();
                  }}>Rút khỏi lớp</button>
                )}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}

function AttendanceTab({ classId, students, canEdit, meId }: any) {
  const [date, setDate] = useState(today());
  const [state, setState] = useState<Record<string, { status: string; note: string }>>({});
  const [saved, setSaved] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('bms_attendance').select('*').eq('class_id', classId).eq('date', date);
      const map: any = {};
      students.forEach((s: any) => {
        const ex = (data || []).find((a: any) => a.student_id === s.id);
        map[s.id] = { status: ex?.status || 'present', note: ex?.note || '' };
      });
      setState(map);
      setSaved('');
    })();
  }, [date, students, classId]);

  async function save() {
    const rows = students.map((s: any) => ({
      class_id: classId, student_id: s.id, date,
      status: state[s.id].status, note: state[s.id].note || null, recorded_by: meId,
    }));
    const r = await supabase.from('bms_attendance').upsert(rows, { onConflict: 'class_id,student_id,date' });
    setSaved(r.error ? '⚠ ' + r.error.message : '✓ Đã lưu điểm danh');
  }

  if (students.length === 0) return <Empty msg="Lớp chưa có học viên" />;
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-mono text-navy-400">Ngày:</label>
        <input type="date" className={inputCls + ' max-w-[180px]'} value={date} onChange={e => setDate(e.target.value)} />
        {saved && <span className={saved.startsWith('✓') ? 'text-emerald-400 text-sm' : 'text-red-400 text-sm'}>{saved}</span>}
      </div>
      <TableWrap>
        <thead><tr><Th>Học viên</Th><Th>Trạng thái</Th><Th>Ghi chú</Th></tr></thead>
        <tbody>
          {students.map((s: any) => (
            <tr key={s.id}>
              <Td><b className="text-white">{s.name}</b></Td>
              <Td>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(ATT_STATUS).map(([k, [l, cls]]) => (
                    <button key={k} disabled={!canEdit}
                      onClick={() => setState(st => ({ ...st, [s.id]: { ...st[s.id], status: k } }))}
                      className={`px-2.5 py-1 rounded-md text-xs border ${state[s.id]?.status === k ? cls + ' border-transparent' : 'border-navy-600 text-navy-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </Td>
              <Td>
                <input className={inputCls + ' max-w-[200px]'} disabled={!canEdit} placeholder="Ghi chú"
                  value={state[s.id]?.note || ''} onChange={e => setState(st => ({ ...st, [s.id]: { ...st[s.id], note: e.target.value } }))} />
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {canEdit && <button className={btnPri + ' mt-4'} onClick={save}>💾 Lưu điểm danh</button>}
    </>
  );
}

function GradesTab({ classId, students, canEdit, meId, isTeacher }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const { data } = await supabase.from('bms_grades').select('*, bms_students(name)').eq('class_id', classId).order('date');
    setRows(data || []);
  }
  useEffect(() => { load(); }, [classId]);

  function set(k: string, v: any) { setEditing((e: any) => ({ ...e, [k]: v })); }
  async function save() {
    const e = editing!;
    if (!e.student_id || !e.name || e.score === '' || e.score == null) throw new Error('Thiếu học viên / tên bài / điểm');
    const payload: any = {
      class_id: classId, student_id: e.student_id, type: e.type || 'quiz', name: e.name,
      score: Number(e.score), max_score: Number(e.max_score) || 10, weight: Number(e.weight) || 1,
      date: e.date || today(), comment: e.comment || null, recorded_by: meId,
    };
    const r = e.id
      ? await supabase.from('bms_grades').update(payload).eq('id', e.id)
      : await supabase.from('bms_grades').insert(payload);
    if (r.error) throw new Error(r.error.message);
    await load();
  }

  return (
    <>
      {canEdit && <button className={btnPri + ' mb-4'} onClick={() => setEditing({ type: 'quiz', max_score: 10, weight: 1, date: today() })}>+ Nhập điểm</button>}
      {rows.length === 0 ? <Empty msg="Chưa có điểm" /> : (
        <TableWrap>
          <thead><tr><Th>Ngày</Th><Th>Học viên</Th><Th>Loại</Th><Th>Bài</Th><Th>Điểm</Th><Th>Nhận xét</Th><Th>{''}</Th></tr></thead>
          <tbody>
            {rows.map(g => (
              <tr key={g.id} className="hover:bg-navy-700/30">
                <Td>{fmtDate(g.date)}</Td>
                <Td><b className="text-white">{g.bms_students?.name}</b></Td>
                <Td>{GRADE_TYPES[g.type] || g.type}</Td>
                <Td>{g.name}</Td>
                <Td><b className="text-brand-500">{g.score}/{g.max_score}</b></Td>
                <Td className="max-w-[240px]">{g.comment || ''}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    {canEdit && <button className={btnSm} onClick={() => setEditing(g)}>Sửa</button>}
                    {isTeacher && <button className={btnSmDanger} onClick={async () => { await supabase.from('bms_grades').delete().eq('id', g.id); load(); }}>Xóa</button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {editing && (
        <Modal title={editing.id ? 'Sửa điểm' : 'Nhập điểm'} onClose={() => setEditing(null)} onSave={save}>
          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Học viên *">
              <select className={inputCls} value={editing.student_id || ''} onChange={e => set('student_id', e.target.value)}>
                <option value="">— Chọn —</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Loại *">
              <select className={inputCls} value={editing.type || 'quiz'} onChange={e => set('type', e.target.value)}>
                {Object.entries(GRADE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Tên bài *"><input className={inputCls} placeholder="Quiz Unit 4" value={editing.name || ''} onChange={e => set('name', e.target.value)} /></Field>
            <Field label="Ngày"><input type="date" className={inputCls} value={editing.date || today()} onChange={e => set('date', e.target.value)} /></Field>
            <Field label="Điểm *"><input type="number" step="0.1" className={inputCls} value={editing.score ?? ''} onChange={e => set('score', e.target.value)} /></Field>
            <Field label="Thang điểm"><input type="number" className={inputCls} value={editing.max_score ?? 10} onChange={e => set('max_score', e.target.value)} /></Field>
            <Field label="Hệ số"><input type="number" step="0.5" className={inputCls} value={editing.weight ?? 1} onChange={e => set('weight', e.target.value)} /></Field>
          </div>
          <Field label="Nhận xét"><textarea rows={2} className={inputCls} value={editing.comment || ''} onChange={e => set('comment', e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell><Inner /></BmsShell>;
}
