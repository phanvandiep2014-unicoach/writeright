'use client';
// UNICOACH BMS — Truy xuất điểm từ Google Classroom
// Cách hoạt động: đăng nhập lại Google kèm scope Classroom (read-only) → chọn khóa học
// → đối chiếu học viên qua email → nhập điểm vào bms_grades (type 'classroom', chống trùng bằng external_id)
import { useEffect, useState } from 'react';
import {
  BmsShell, supabase, Card, Empty, PageHead, btnPri, btnSec, btnSm, inputCls,
} from '@/components/bms/ui';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
].join(' ');

async function gapi(token: string, path: string) {
  const r = await fetch('https://classroom.googleapis.com/v1/' + path, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('Classroom API ' + r.status + (r.status === 403 ? ' — chưa bật Classroom API hoặc thiếu scope' : ''));
  return r.json();
}

function Inner() {
  const [token, setToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [course, setCourse] = useState('');
  const [target, setTarget] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const t = (session as any)?.provider_token || null;
      setToken(t);
      const [c, s] = await Promise.all([
        supabase.from('bms_classes').select('id, name, code').order('code'),
        supabase.from('bms_students').select('id, name, email').not('email', 'is', null),
      ]);
      setClasses(c.data || []); setStudents(s.data || []);
      if (t) {
        try {
          const d = await gapi(t, 'courses?teacherId=me&courseStates=ACTIVE');
          setCourses(d.courses || []);
        } catch (e: any) { setErr(e.message); }
      }
    })();
  }, []);

  async function connect() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: SCOPES,
        redirectTo: window.location.origin + '/admin/classroom',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }

  async function importGrades() {
    if (!token || !course || !target) return;
    setBusy(true); setErr(''); setLog([]);
    const add = (m: string) => setLog(l => [...l, m]);
    try {
      // 1. Roster: userId -> email
      const roster = await gapi(token, `courses/${course}/students?pageSize=100`);
      const emailByUid: Record<string, string> = {};
      (roster.students || []).forEach((st: any) => { emailByUid[st.userId] = (st.profile?.emailAddress || '').toLowerCase(); });
      add(`Roster: ${Object.keys(emailByUid).length} học viên trên Classroom`);

      // 2. Map email -> bms_student trong lớp đích
      const { data: enrolled } = await supabase.from('bms_enrollments').select('student_id').eq('class_id', target);
      const ids = new Set((enrolled || []).map((e: any) => e.student_id));
      const byEmail: Record<string, any> = {};
      students.filter(s => ids.size === 0 || ids.has(s.id)).forEach(s => { if (s.email) byEmail[s.email.toLowerCase()] = s; });

      // 3. CourseWork + submissions
      const cw = await gapi(token, `courses/${course}/courseWork?pageSize=100`);
      let n = 0, skip = 0;
      for (const w of cw.courseWork || []) {
        if (w.maxPoints == null) continue;
        const subs = await gapi(token, `courses/${course}/courseWork/${w.id}/studentSubmissions?pageSize=200`);
        for (const sub of subs.studentSubmissions || []) {
          const grade = sub.assignedGrade ?? sub.draftGrade;
          if (grade == null) continue;
          const email = emailByUid[sub.userId];
          const stu = email && byEmail[email];
          if (!stu) { skip++; continue; }
          const r = await supabase.from('bms_grades').upsert({
            class_id: target, student_id: stu.id, type: 'classroom',
            name: w.title, score: Number(grade), max_score: Number(w.maxPoints), weight: 1,
            date: (sub.updateTime || w.creationTime || '').slice(0, 10) || null,
            comment: 'Google Classroom', external_id: `gc:${course}:${w.id}:${sub.userId}`,
          }, { onConflict: 'external_id' });
          if (!r.error) n++; else add('⚠ ' + stu.name + ': ' + r.error.message);
        }
      }
      add(`✓ Đã nhập/cập nhật ${n} điểm${skip ? ` · bỏ qua ${skip} bài không khớp email học viên` : ''}`);
      add('Xem tại Lớp học → tab Điểm số (loại "Classroom") và trong báo cáo phụ huynh.');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <>
      <PageHead title="Google Classroom — truy xuất điểm" />

      {!token ? (
        <Card>
          <p className="text-sm text-navy-100 mb-3">
            Kết nối tài khoản Google (giáo viên trên Classroom) để đọc điểm bài tập. Chỉ yêu cầu quyền <b>chỉ đọc</b>: danh sách khóa học, bài tập, điểm và email học viên.
          </p>
          <button className={btnPri} onClick={connect}>🔗 Kết nối Google Classroom</button>
          <p className="text-xs text-navy-400 mt-3">
            Lưu ý lần đầu: cần bật <b>Google Classroom API</b> và thêm các scope classroom.* vào OAuth consent screen trong Google Cloud Console (cùng project với OAuth client của Supabase).
          </p>
        </Card>
      ) : (
        <Card>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-navy-400 mb-1.5">Khóa học trên Classroom</label>
              <select className={inputCls} value={course} onChange={e => setCourse(e.target.value)}>
                <option value="">— Chọn khóa học —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ' · ' + c.section : ''}</option>)}
              </select>
              {courses.length === 0 && !err && <p className="text-xs text-navy-400 mt-1">Không thấy khóa học nào (bạn phải là giáo viên của khóa).</p>}
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-navy-400 mb-1.5">Nhập vào lớp UNICOACH</label>
              <select className={inputCls} value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">— Chọn lớp —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button className={btnPri + ' disabled:opacity-50'} disabled={!course || !target || busy} onClick={importGrades}>
              {busy ? 'Đang nhập điểm…' : '⬇ Nhập điểm về BMS'}
            </button>
            <button className={btnSec} onClick={connect}>Kết nối lại / đổi tài khoản</button>
          </div>
          <p className="text-xs text-navy-400 mt-3">
            Đối chiếu học viên bằng <b>email</b>: email trên Classroom phải trùng email trong hồ sơ học viên BMS. Chạy lại bất kỳ lúc nào — điểm trùng sẽ được cập nhật, không nhân đôi.
          </p>
        </Card>
      )}

      {err && <Card className="!border-red-500/30"><p className="text-sm text-red-400">{err}</p></Card>}
      {log.length > 0 && (
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-navy-400 mb-2">Kết quả</div>
          {log.map((l, i) => <p key={i} className="text-sm text-navy-100">{l}</p>)}
        </Card>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell allow={['admin', 'teacher']}><Inner /></BmsShell>;
}
