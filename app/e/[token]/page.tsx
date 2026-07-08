import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// /e/[token] — Full evaluation detail page (read-only, shareable)
// Uses security definer RPC so public can view without auth

type Bi = string | { en: string; vi: string };
const tEn = (f: Bi | undefined) => !f ? '' : typeof f === 'string' ? f : f.en || '';
const tVi = (f: Bi | undefined) => !f || typeof f === 'string' ? '' : f.vi || '';

const CAT_COLOR: Record<string,string> = {
  grammar:'#8C2F3A', vocabulary:'#5B4A82', register:'#9A7A2E',
  tone:'#A8602A', reference:'#2E5A7A', dialect:'#2F6B54', spelling:'#8A4A6B',
};
const CAT_LABEL: Record<string,string> = {
  grammar:'Grammar', vocabulary:'Vocabulary', register:'Register',
  tone:'Tone', reference:'Reference', dialect:'Dialect', spelling:'Spelling',
};

async function getEval(token: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  // Validate UUID format before querying
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) return null;

  // Use security definer RPC — allows public access without auth
  const { data, error } = await supabase
    .rpc('get_evaluation_by_share', { p_share_id: token });

  if (error) {
    console.error('[e/token] RPC error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

function Section({ title, sub, children }: { title:string; sub?:string; children:React.ReactNode }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-navy-700 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{title}</span>
        {sub && <span className="text-[10px] text-navy-500 italic ml-1">{sub}</span>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function BiText({ f, viClass }: { f: Bi | undefined; viClass?: string }) {
  const en = tEn(f); const vi = tVi(f);
  if (!en && !vi) return null;
  return <span>{en}{vi ? <span className={viClass||'block text-[11px] italic text-navy-500 mt-0.5'}>{vi}</span> : null}</span>;
}

export default async function EvalDetailPage({ params }: { params: { token: string } }) {
  const row = await getEval(params.token);
  if (!row) return notFound();

  const fb = row.feedback as any;
  const overall = row.overall_band ?? fb?.overall_band ?? 0;

  const criteria = [
    { key:'task_achievement', label:'Task Achievement', short:'TA', band:row.ta_band },
    { key:'coherence_cohesion', label:'Coherence & Cohesion', short:'CC', band:row.cc_band },
    { key:'lexical_resource', label:'Lexical Resource', short:'LR', band:row.lr_band },
    { key:'grammatical_range', label:'Grammar & Accuracy', short:'GR', band:row.gra_band },
  ];

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-xs">W</div>
            <span className="text-white text-sm font-semibold">Write<span className="text-brand-400">Right</span></span>
          </Link>
          <span className="text-xs text-navy-400 font-mono">Phiếu chấm điểm</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          {row.sharer_avatar
            ? <img src={row.sharer_avatar} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full border border-navy-600 object-cover shrink-0"/>
            : <div className="w-12 h-12 rounded-full bg-brand-500/20 border border-navy-600 flex items-center justify-center text-brand-400 font-bold text-lg shrink-0">
                {(row.sharer_name||'?').charAt(0).toUpperCase()}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">{row.sharer_name || 'IELTS Writer'}</p>
            <p className="text-[10px] font-mono text-navy-500 mt-0.5">
              Task {row.task_type} · {row.word_count} từ · {new Date(row.created_at).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-bold text-white leading-none">{overall}</p>
            <p className="text-[9px] font-mono text-navy-500 mt-0.5">OVERALL BAND</p>
          </div>
        </div>

        {row.task_prompt && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 mb-4">
            <p className="text-[10px] font-mono text-navy-400 uppercase tracking-widest mb-2">Đề bài</p>
            <p className="text-sm text-navy-200 leading-relaxed">{row.task_prompt}</p>
          </div>
        )}

        {fb?.headline && (
          <div className="bg-navy-800 border border-brand-500/30 rounded-xl px-5 py-4 mb-4">
            <p className="text-sm font-semibold text-white mb-1"><BiText f={fb.headline} viClass="block text-xs text-navy-400 italic mt-0.5 font-normal"/></p>
            {fb?.summary && <p className="text-sm text-navy-300 leading-relaxed"><BiText f={fb.summary}/></p>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {criteria.map(c => {
            const d = fb?.[c.key];
            return (
              <div key={c.key} className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-navy-300">{c.label}</span>
                  <span className="text-2xl font-bold text-brand-400">{c.band ?? d?.band ?? '—'}</span>
                </div>
                {d?.feedback && <p className="text-xs text-navy-400 leading-relaxed"><BiText f={d.feedback}/></p>}
                {d?.improvements && d.improvements.length>0 && (
                  <ul className="mt-2 space-y-1">
                    {d.improvements.slice(0,2).map((tip:Bi,i:number)=>(
                      <li key={i} className="text-xs text-navy-500 flex gap-1.5"><span className="text-brand-500 shrink-0">→</span><BiText f={tip}/></li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {fb?.error_corrections?.length > 0 && (
          <Section title="Lỗi cần sửa" sub="Error Corrections">
            <div className="space-y-3">
              {fb.error_corrections.map((c:any, i:number) => (
                <div key={i} className="border-b border-navy-700/50 pb-3 last:border-0 last:pb-0">
                  {c.category && CAT_LABEL[c.category] && (
                    <span className="inline-block text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5"
                      style={{color:CAT_COLOR[c.category], background:CAT_COLOR[c.category]+'22'}}>
                      {CAT_LABEL[c.category]}
                    </span>
                  )}
                  <p className="text-xs text-red-400 line-through mb-0.5">{c.original}</p>
                  <p className="text-xs text-green-400 mb-1">✓ {c.corrected}</p>
                  <p className="text-xs text-navy-400"><BiText f={c.explanation}/></p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {fb?.language_insights && (
          <Section title="🔬 Language Insights" sub="Phân tích ngôn ngữ chuyên sâu">
            <div className="space-y-4">
              {[
                {key:'register', title:'Register', sub:'Văn phong'},
                {key:'tone_nuance', title:'Tone & Nuance', sub:'Sắc thái'},
                {key:'reference_cohesion', title:'Reference & Cohesion', sub:'Quy chiếu'},
                {key:'dialect', title:'Dialect', sub:'Phương ngữ'},
              ].map(g => {
                const grp = fb.language_insights[g.key];
                if (!grp?.notes?.length) return null;
                return (
                  <div key={g.key}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-brand-400">{g.title}</span>
                      <span className="text-[10px] text-navy-500 italic">{g.sub}</span>
                    </div>
                    <div className="space-y-1">
                      {grp.notes.map((n:Bi, i:number) => (
                        <p key={i} className="text-xs text-navy-300 pl-3 relative leading-relaxed">
                          <span className="absolute left-0 text-brand-500">•</span><BiText f={n}/>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {fb?.key_strengths?.length > 0 && (
          <Section title="✦ Điểm mạnh" sub="Key Strengths">
            <ul className="space-y-1.5">
              {fb.key_strengths.map((s:Bi, i:number) => (
                <li key={i} className="text-sm text-green-300 border-l-2 border-green-800 pl-3 py-0.5 leading-relaxed"><BiText f={s}/></li>
              ))}
            </ul>
          </Section>
        )}

        {fb?.priority_fixes?.length > 0 && (
          <Section title="⚡ Cần sửa ngay" sub="Priority Fixes">
            <ul className="space-y-1.5">
              {fb.priority_fixes.map((f:Bi, i:number) => (
                <li key={i} className="text-sm text-amber-300 border-l-2 border-amber-800 pl-3 py-0.5 leading-relaxed"><BiText f={f}/></li>
              ))}
            </ul>
          </Section>
        )}

        {fb?.model_introduction && (
          <Section title="📝 Mẫu mở bài Band 9" sub="Model Introduction">
            <p className="text-sm text-navy-100 leading-relaxed italic pl-3 border-l-2 border-brand-500/40">{fb.model_introduction}</p>
          </Section>
        )}

        {row.essay_text && (
          <Section title="Bài viết gốc" sub="Original Essay">
            <p className="text-sm text-navy-400 leading-relaxed whitespace-pre-wrap font-mono text-[12px]">{row.essay_text}</p>
          </Section>
        )}

        <div className="mt-8 text-center">
          <Link href="/evaluate" className="inline-block px-6 py-3 rounded-xl bg-brand-500 text-navy-900 font-semibold text-sm hover:bg-brand-400 transition">
            Chấm bài của bạn →
          </Link>
        </div>
      </main>
    </div>
  );
}
