import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import EvalDetailView from '@/components/EvalDetailView';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { withBase } from '@/lib/base-path';

// /lms-report/[id] — Bản chấm ĐẦY ĐỦ của bài thi thử Writing làm trong UNICOACH LMS.
// LMS (phiếu điểm + phiếu in có QR) dẫn sang đây. id là uuid khó đoán; ai có link thì xem được, như /e/[token].
// Dữ liệu do máy chủ ghi (mock-grade, mock-rewrite) vào bảng lms_mock_reports — chỉ service role đọc được.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bản chấm Writing thi thử · WriteRight', robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getReport(id: string) {
  if (!UUID.test(id)) return null;
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin.from('lms_mock_reports').select('id,paper,data,extras_ready,created_at').eq('id', id).maybeSingle();
    if (error) { console.error('[lms-report]', error.message); return null; }
    return data;
  } catch (e: any) { console.error('[lms-report]', e?.message); return null; }
}

const fmt = (b: any) => (typeof b === 'number' ? (Number.isInteger(b) ? b.toFixed(1) : String(b)) : '—');

export default async function LmsMockReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rep = await getReport(id);
  if (!rep) return notFound();
  const d: any = rep.data || {};
  const name = d.student_name || 'Học viên UNICOACH';
  const tasks = (['task1', 'task2'] as const).map((k, i) => ({ k, n: i + 1, t: d.tasks?.[k] })).filter(x => x.t);

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="app-logo-link" aria-label="WriteRight home">
            <img src={withBase('/favicon.svg')} alt="" width={30} height={30} />
            <span className="app-logo-wordmark">Write<span className="gold-foil">Right</span></span>
          </Link>
          <span style={{ flex: 1 }} />
          <span className="app-nav-link" style={{ cursor: 'default', opacity: .7 }}>Bản chấm thi thử · UNICOACH</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        <section className="rounded-2xl border border-navy-700 bg-navy-800/60 p-6 md:p-8">
          <p className="text-sm uppercase tracking-widest text-navy-400">Thi thử IELTS Writing · Đề {rep.paper || d.paper?.id || ''}</p>
          <h1 className="text-white text-2xl md:text-3xl mt-2" style={{ fontFamily: 'var(--font-heading)' }}>{name}</h1>
          <div className="flex flex-wrap items-end gap-8 mt-6">
            <div>
              <div className="text-5xl text-white" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(d.band)}</div>
              <div className="text-sm text-navy-400 mt-1">Writing band</div>
            </div>
            {tasks.map(({ k, n, t }) => (
              <div key={k}>
                <div className="text-3xl text-navy-100" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(t.band)}</div>
                <div className="text-sm text-navy-400 mt-1">Task {n} · {t.words} từ</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-navy-400 mt-5 leading-relaxed">
            Band Writing = (Task 1 + 2 × Task 2) / 3, làm tròn theo quy tắc chính thức. Bài dưới 20 từ tính band 0 cho phần đó.
            Đây là kết quả chấm tự động của bài thi thử nội bộ, không thay thế kết quả IELTS chính thức.
          </p>
          {!rep.extras_ready && (
            <p className="mt-4 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-navy-100">
              ⏳ Phân tích ngôn ngữ, mở bài mẫu và bài viết lại band 8.5–9.0 đang được tạo — tải lại trang sau 2–4 phút.
            </p>
          )}
        </section>
      </main>

      {tasks.map(({ k, n, t }) => (
        <section key={k} className="pt-6">
          <h2 className="max-w-4xl mx-auto px-4 text-white text-xl" style={{ fontFamily: 'var(--font-heading)' }}>Task {n}</h2>
          {t.result
            ? <EvalDetailView row={{
                feedback: t.result, overall_band: t.band, essay_text: t.essay, task_type: n,
                word_count: t.words, created_at: d.graded_at || rep.created_at, task_prompt: t.prompt, sharer_name: name,
              }} />
            : <p className="max-w-4xl mx-auto px-4 py-6 text-navy-300">Phần này chưa làm bài (dưới 20 từ) — tính band 0.</p>}
        </section>
      ))}
    </div>
  );
}
