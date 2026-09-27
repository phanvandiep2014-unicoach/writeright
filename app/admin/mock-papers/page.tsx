'use client';
// UNICOACH BMS — Đề thi chung theo ngày (Writing mock test)
//
// Giáo viên tự upload MỘT bộ đề (Task 1 + Task 2) cho buổi thi thử IELTS
// hàng tháng tại trung tâm. Đề gắn với MỘT ngày (exam_date) — mọi học viên
// tham gia buổi thi hôm đó, dù vào qua chặng thi thử 4 kỹ năng của LMS hay
// tự vào writeright.unicoach.vn/mock, đều làm chung đúng đề này (xem
// lib/daily-papers.ts + app/mock/page.tsx). Giúp giáo viên chấm chữa và hỗ
// trợ sau thi dễ so sánh giữa các học viên trong cùng buổi thi.
//
// Task 1 nhập dưới dạng CHỮ (không phải upload ảnh) — đúng nguyên tắc của
// toàn bộ tính năng thi thử: số liệu ở dạng chữ thì AI chấm mới bám đúng số
// liệu thật, và trang tự vẽ lại biểu đồ/sơ đồ (không cần ảnh). Với đề có sẵn
// dạng ảnh (ví dụ file giáo viên nhận từ nguồn khác), gõ lại đúng số liệu/các
// bước vào các ô bên dưới.
import { useEffect, useState } from 'react';
import {
  BmsShell, supabase, useBmsUser, Modal, Field, inputCls,
  Empty, PageHead, btnPri, btnSm, btnSmDanger, fmtDate, today,
} from '@/components/bms/ui';
import { ChartType, Task1Item, Task2Item } from '@/lib/writing-tasks';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'process', label: 'Quy trình (process)' },
  { value: 'table', label: 'Bảng số liệu (table)' },
  { value: 'bar', label: 'Biểu đồ cột (bar)' },
  { value: 'line', label: 'Biểu đồ đường (line)' },
  { value: 'pie', label: 'Biểu đồ tròn (pie)' },
];
const T2_TYPES: { value: Task2Item['type']; label: string }[] = [
  { value: 'opinion', label: 'Nêu quan điểm (opinion)' },
  { value: 'discussion', label: 'Thảo luận hai ý kiến (discussion)' },
  { value: 'problem-solution', label: 'Nguyên nhân – giải pháp' },
  { value: 'adv-disadv', label: 'Lợi và hại' },
  { value: 'two-part', label: 'Hai câu hỏi (two-part)' },
];

const DEFAULT_INSTRUCTION: Record<ChartType, string> = {
  process: 'The diagram below shows the process of ___. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  table: 'The table below shows ___. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  bar: 'The bar chart below shows ___. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  line: 'The line graph below shows ___. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  pie: 'The pie charts below show ___. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  map: '',
};

type FormState = {
  id?: string;
  exam_date: string;
  title: string;
  chartType: ChartType;
  t1title: string;
  instruction: string;
  unit: string;
  categoriesText: string;   // bar/line: "A, B, C"
  seriesText: string;       // bar/line: "Tên: 1, 2, 3" mỗi dòng một chuỗi
  piesText: string;         // pie: khối cách nhau bằng dòng trống, dòng đầu là nhãn
  headersText: string;      // table: "cột1, cột2"
  rowsText: string;         // table: mỗi dòng một hàng, phân cách dấu phẩy
  stepsText: string;        // process: mỗi dòng một bước
  notesText: string;        // mọi loại: mỗi dòng một ghi chú
  t2type: Task2Item['type'];
  t2prompt: string;
};

function emptyForm(): FormState {
  return {
    exam_date: today(), title: '', chartType: 'process',
    t1title: '', instruction: '', unit: '',
    categoriesText: '', seriesText: '', piesText: '', headersText: '', rowsText: '',
    stepsText: '', notesText: '', t2type: 'opinion', t2prompt: '',
  };
}

function rowToForm(r: any): FormState {
  const t1: Task1Item = r.task1 || {};
  const f = emptyForm();
  f.id = r.id; f.exam_date = r.exam_date; f.title = r.title || '';
  f.chartType = t1.chartType || 'process';
  f.t1title = t1.title || ''; f.instruction = t1.instruction || ''; f.unit = t1.unit || '';
  f.categoriesText = (t1.categories || []).join(', ');
  f.seriesText = (t1.series || []).map(s => `${s.name}: ${s.values.join(', ')}`).join('\n');
  f.piesText = (t1.pies || []).map(p => [p.label, ...p.slices.map(sl => `${sl.label}: ${sl.value}`)].join('\n')).join('\n\n');
  f.headersText = (t1.table?.headers || []).join(', ');
  f.rowsText = (t1.table?.rows || []).map(row => row.join(', ')).join('\n');
  f.stepsText = (t1.steps || []).join('\n');
  f.notesText = (t1.notes || []).join('\n');
  f.t2type = r.task2_type || 'opinion';
  f.t2prompt = r.task2_prompt || '';
  return f;
}

function splitLines(s: string): string[] {
  return s.split('\n').map(x => x.trim()).filter(Boolean);
}
function splitCsv(s: string): string[] {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

/** Gói dữ liệu form thành Task1Item — ném lỗi rõ ràng nếu thiếu phần bắt buộc
 * theo loại đã chọn, để giáo viên sửa ngay trong modal thay vì lưu đề hỏng. */
function buildTask1(f: FormState): Task1Item {
  if (!f.t1title.trim()) throw new Error('Cần nhập tiêu đề Task 1');
  if (!f.instruction.trim()) throw new Error('Cần nhập đề bài Task 1 (instruction)');
  const base: Task1Item = {
    id: 'daily-t1', category: 'other', chartType: f.chartType,
    title: f.t1title.trim(), instruction: f.instruction.trim(),
    notes: splitLines(f.notesText),
  };
  if (f.unit.trim()) base.unit = f.unit.trim();

  if (f.chartType === 'process') {
    const steps = splitLines(f.stepsText);
    if (steps.length < 2) throw new Error('Quy trình cần ít nhất 2 bước, mỗi bước một dòng');
    base.steps = steps;
  } else if (f.chartType === 'table') {
    const headers = splitCsv(f.headersText);
    const rows = splitLines(f.rowsText).map(splitCsv);
    if (!headers.length || !rows.length) throw new Error('Bảng cần tiêu đề cột và ít nhất một hàng dữ liệu');
    base.table = { headers, rows };
  } else if (f.chartType === 'bar' || f.chartType === 'line') {
    const categories = splitCsv(f.categoriesText);
    const series = splitLines(f.seriesText).map(line => {
      const [name, rest] = line.split(':');
      if (!rest) throw new Error(`Dòng chuỗi số liệu sai định dạng: "${line}" — cần dạng "Tên: 1, 2, 3"`);
      return { name: name.trim(), values: splitCsv(rest).map(Number) };
    });
    if (!categories.length || !series.length) throw new Error('Cần nhãn trục X và ít nhất một chuỗi số liệu');
    base.categories = categories; base.series = series;
  } else if (f.chartType === 'pie') {
    const blocks = f.piesText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    if (!blocks.length) throw new Error('Cần ít nhất một biểu đồ tròn');
    base.pies = blocks.map(block => {
      const lines = splitLines(block);
      const [label, ...sliceLines] = lines;
      const slices = sliceLines.map(line => {
        const [l, v] = line.split(':');
        if (v === undefined) throw new Error(`Dòng lát cắt sai định dạng: "${line}" — cần dạng "Nhãn: 30"`);
        return { label: l.trim(), value: Number(v.trim()) };
      });
      if (!slices.length) throw new Error(`Biểu đồ "${label}" chưa có lát cắt nào`);
      return { label, slices };
    });
  }
  return base;
}

function Inner() {
  const me = useBmsUser();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<FormState | null>(null);

  async function load() {
    const { data } = await supabase.from('mock_daily_papers').select('*').order('exam_date', { ascending: false });
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setEditing(e => (e ? { ...e, [k]: v } : e));
  }

  async function save() {
    const f = editing!;
    if (!f.exam_date) throw new Error('Cần chọn ngày thi');
    if (!f.t2prompt.trim()) throw new Error('Cần nhập đề bài Task 2');
    const task1 = buildTask1(f);
    const payload = {
      exam_date: f.exam_date,
      title: f.title.trim() || null,
      task1,
      task2_prompt: f.t2prompt.trim(),
      task2_type: f.t2type,
    };
    const r = f.id
      ? await supabase.from('mock_daily_papers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', f.id)
      : await supabase.from('mock_daily_papers').insert({ ...payload, created_by: me.id });
    if (r.error) throw new Error(r.error.message);
    await load();
  }

  return (
    <>
      <PageHead title="Đề thi chung theo ngày (Writing mock test)">
        <button className={btnPri} onClick={() => setEditing(emptyForm())}>+ Đề mới</button>
      </PageHead>
      <p className="text-xs text-navy-400 mb-4 leading-relaxed max-w-2xl">
        Mỗi ngày một đề — học viên tham gia buổi thi thử hôm đó (qua LMS hoặc tự vào writeright.unicoach.vn/mock)
        đều làm chung đúng đề này, giúp chấm chữa và hỗ trợ sau thi dễ so sánh giữa các bạn.
      </p>
      {rows.length === 0 ? <Empty msg="Chưa có đề thi chung nào" /> : rows.map(r => (
        <div key={r.id} className="bg-navy-800/60 border border-navy-700 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <h3 className="text-white font-semibold">{fmtDate(r.exam_date)} · {r.title || 'Đề thi chung'}</h3>
              <p className="text-xs text-navy-400 mt-1">
                Task 1: {r.task1?.chartType} — {r.task1?.title} · Task 2: {r.task2_type}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button className={btnSm} onClick={() => setEditing(rowToForm(r))}>Sửa</button>
              <button className={btnSmDanger} onClick={async () => { await supabase.from('mock_daily_papers').delete().eq('id', r.id); load(); }}>Xóa</button>
            </div>
          </div>
          <p className="text-sm text-navy-100 mt-3 italic">{r.task2_prompt}</p>
        </div>
      ))}

      {editing && (
        <Modal title={editing.id ? 'Sửa đề thi chung' : 'Đề thi chung mới'} wide onClose={() => setEditing(null)} onSave={save}>
          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Ngày thi *"><input type="date" className={inputCls} value={editing.exam_date} onChange={e => set('exam_date', e.target.value)} /></Field>
            <Field label="Tên đề (tuỳ chọn)"><input className={inputCls} placeholder="VD: Thi thử tháng 9" value={editing.title} onChange={e => set('title', e.target.value)} /></Field>
          </div>

          <h4 className="text-brand-500 text-sm font-semibold mt-5 mb-2">Task 1</h4>
          <Field label="Loại biểu đồ *">
            <select className={inputCls} value={editing.chartType}
              onChange={e => {
                const ct = e.target.value as ChartType;
                set('chartType', ct);
                if (!editing.instruction.trim()) set('instruction', DEFAULT_INSTRUCTION[ct] || '');
              }}>
              {CHART_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Tiêu đề Task 1 (tiếng Việt, ngắn gọn) *"><input className={inputCls} value={editing.t1title} onChange={e => set('t1title', e.target.value)} /></Field>
          <Field label="Đề bài Task 1 — instruction (tiếng Anh) *"><textarea rows={3} className={inputCls} value={editing.instruction} onChange={e => set('instruction', e.target.value)} /></Field>

          {editing.chartType === 'process' && (
            <Field label="Các bước — mỗi dòng một bước *">
              <textarea rows={6} className={inputCls} placeholder={'Bước 1...\nBước 2...'} value={editing.stepsText} onChange={e => set('stepsText', e.target.value)} />
            </Field>
          )}
          {editing.chartType === 'table' && <>
            <Field label="Tiêu đề cột, phân cách bằng dấu phẩy *"><input className={inputCls} placeholder="Năm, Việt Nam, Hàn Quốc" value={editing.headersText} onChange={e => set('headersText', e.target.value)} /></Field>
            <Field label="Các hàng dữ liệu — mỗi dòng một hàng, phân cách dấu phẩy *">
              <textarea rows={5} className={inputCls} placeholder={'2000, 4.5, 3.6\n2020, 5.5, 3.9'} value={editing.rowsText} onChange={e => set('rowsText', e.target.value)} />
            </Field>
          </>}
          {(editing.chartType === 'bar' || editing.chartType === 'line') && <>
            <div className="grid md:grid-cols-2 gap-x-4">
              <Field label="Đơn vị (tuỳ chọn)"><input className={inputCls} placeholder="%" value={editing.unit} onChange={e => set('unit', e.target.value)} /></Field>
              <Field label="Nhãn trục X, phân cách bằng dấu phẩy *"><input className={inputCls} placeholder="UK, Japan, Brazil" value={editing.categoriesText} onChange={e => set('categoriesText', e.target.value)} /></Field>
            </div>
            <Field label='Các chuỗi số liệu — mỗi dòng "Tên: giá trị, giá trị..." *'>
              <textarea rows={4} className={inputCls} placeholder={'2000: 4.5, 3.6, 4.0\n2020: 5.5, 3.9, 6.1'} value={editing.seriesText} onChange={e => set('seriesText', e.target.value)} />
            </Field>
          </>}
          {editing.chartType === 'pie' && (
            <Field label='Biểu đồ tròn — dòng đầu là nhãn biểu đồ, các dòng sau "Nhãn: giá trị"; cách nhau một dòng trống nếu có nhiều biểu đồ *'>
              <textarea rows={6} className={inputCls} placeholder={'Năm 2000\nGiáo dục: 30\nY tế: 25\n\nNăm 2020\nGiáo dục: 20\nY tế: 35'} value={editing.piesText} onChange={e => set('piesText', e.target.value)} />
            </Field>
          )}
          <Field label="Ghi chú thêm cho AI chấm (tuỳ chọn) — mỗi dòng một ghi chú">
            <textarea rows={2} className={inputCls} value={editing.notesText} onChange={e => set('notesText', e.target.value)} />
          </Field>

          <h4 className="text-brand-500 text-sm font-semibold mt-5 mb-2">Task 2</h4>
          <Field label="Dạng bài luận *">
            <select className={inputCls} value={editing.t2type} onChange={e => set('t2type', e.target.value as Task2Item['type'])}>
              {T2_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Đề bài Task 2 (tiếng Anh) *"><textarea rows={4} className={inputCls} value={editing.t2prompt} onChange={e => set('t2prompt', e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <BmsShell allow={['admin', 'teacher']}><Inner /></BmsShell>;
}
