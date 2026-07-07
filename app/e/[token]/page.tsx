import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// /e/[token] — Full evaluation detail page (read-only, shareable)
// Fetches complete feedback JSON from evaluations table via share token

type Bi = string | { en: string; vi: string };
const tEn = (f: Bi | undefined) => !f ? '' : typeof f === 'string' ? f : f.en || '';
const tVi = (f: Bi | undefined) => !f || typeof f === 'string' ? '' : f.vi || '';

const CAT_COLOR: Record<string,string> = {
  grammar:'#f87171', vocabulary:'#c084fc', register:'#facc15',
  tone:'#fb923c', reference:'#38bdf8', dialect:'#34d399', spelling:'#f472b6',
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
    { cookies: { get: (n:string) => cookieStore.get(n)?.value, set:()=>{}, remove:()=>{} } }
  );
  const { data } = await supabase
    .from('shares')
    .select('token, evaluations(overall_band,ta_band,cc_band,lr_band,gra_band,task_type,task_prompt,essay_text,word_count,created_at,feedback), profiles(full_name,avatar_url,tier)')
    .or(`id.eq.${token},token.eq.${token}`)
    .maybeSingle();
  return data;
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
  if (!row || !row.evaluations) return notFound();

  const ev = row.evaluations as any;
  const prof = row.profiles as any;
  const fb = ev.feedback as any;
  const overall = ev.overall_band ?? fb?.overall_band ?? 0;

  const criteria = [
    { key:'task_achievement', label:'Task Achievement', short:'TA', band:ev.ta_band },
    { key:'coherence_cohesion', label:'Coherence & Cohesion', short:'CC', band:ev.cc_band },
    { key:'lexical_resource', label:'Lexical Resource', short:'LR', band:ev.lr_band },
    { key:'grammatical_range', label:'Grammar & Accuracy', short:'GR', band:ev.gra_band },
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
        {/* Profile + meta */}
        <div className="flex items-center gap-4 mb-6">
          {prof?.avatar_url
            ? <img src={prof.avatar_url} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full border border-navy-600 object-cover shrink-0"/>
            : <div className="w-12 h-12 rounded-full bg-brand-500/20 border border-navy-600 flex items-center justify-center text-brand-400 font-bold text-lg shrink-0">
                {(prof?.full_name||'?').charAt(0).toUpperCase()}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">{prof?.full_name || 'IELTS Writer'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-navy-500">
                Task {ev.task_type} · {ev.word_count} từ · {new Date(ev.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-bold text-white font-['DM_Serif_Display'] leading-none">{overall}</p>
            <p className="text-[9px] font-mono text-navy-500 mt-0.5">OVERALL BAND</p>
          </div>
        </div>

        {/* Task prompt */}
        {ev.task_prompt && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 mb-4">
            <p className="text-[10px] font-mono text-navy-400 uppercase tracking-widest mb-2">Đề bài</p>
            <p className="text-sm text-navy-200 leading-relaxed">{ev.task_prompt}</p>
          </div>
        )}

        {/* Headline + summary */}
        {fb?.headline && (
          <div className="bg-navy-800 border border-brand-500/30 rounded-xl px-5 py-4 mb-4">
            <p className="text-sm font-semibold text-white mb-1"><BiText f={fb.headline} viClass="block text-xs text-navy-400 italic mt-0.5 font-normal"/></p>
            {fb?.summary && <p className="text-sm text-navy-300 leading-relaxed"><BiText f={fb.summary}/></p>}
          </div>
        )}

        {/* 4 criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {criteria.map(c => {
            const d = fb?.[c.key];
            return (
              <div key={c.key} className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-navy-300">{c.label}</span>
                  <span className="text-2xl font-['DM_Serif_Display'] text-brand-400">{c.band ?? d?.band ?? '—'}</span>
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

        {/* Error corrections */}
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

        {/* Language Insights */}
        {fb?.language_insights && (
          <Section title="🔬 Language Insights" sub="Phân tích ngôn ngữ chuyên sâu">
            <div className="space-y-4">
              {[
                {key:'register', title:'Register', sub:'Văn phong', extra:fb.language_insights.register?.rating},
                {key:'tone_nuance', title:'Tone & Nuance', sub:'Sắc thái'},
                {key:'reference_cohesion', title:'Reference & Cohesion', sub:'Quy chiếu & Liên kết'},
                {key:'dialect', title:'Dialect', sub:'Phương ngữ', extra:fb.language_insights.dialect?.variety},
              ].map(g => {
                const grp = fb.language_insights[g.key];
                if (!grp?.notes?.length) return null;
                return (
                  <div key={g.key}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-brand-400">{g.title}</span>
                      <span className="text-[10px] text-navy-500 italic">{g.sub}</span>
                      {g.extra && <span className="ml-auto text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-navy-700 text-navy-300">{g.extra}</span>}
                    </div>
                    <div className="space-y-1">
                      {grp.notes.map((n:Bi, i:number) => (
                        <p key={i} className="text-xs text-navy-300 pl-3 relative leading-relaxed">
                          <span className="absolute left-0 text-brand-500">•</span>
                          <BiText f={n}/>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Strengths */}
        {fb?.key_strengths?.length > 0 && (
          <Section title="✦ Điểm mạnh" sub="Key Strengths">
            <ul className="space-y-1.5">
              {fb.key_strengths.map((s:Bi, i:number) => (
                <li key={i} className="text-sm text-green-300 border-l-2 border-green-800 pl-3 py-0.5 leading-relaxed">
                  <BiText f={s}/>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Priority fixes */}
        {fb?.priority_fixes?.length > 0 && (
          <Section title="⚡ Cần sửa ngay" sub="Priority Fixes">
            <ul className="space-y-1.5">
              {fb.priority_fixes.map((f:Bi, i:number) => (
                <li key={i} className="text-sm text-amber-300 border-l-2 border-amber-800 pl-3 py-0.5 leading-relaxed">
                  <BiText f={f}/>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Model introduction */}
        {fb?.model_introduction && (
          <Section title="📝 Mẫu mở bài Band 9" sub="Model Introduction">
            <p className="text-sm text-navy-100 leading-relaxed italic pl-3 border-l-2 border-brand-500/40">{fb.model_introduction}</p>
          </Section>
        )}

        {/* Essay */}
        {ev.essay_text && (
          <Section title="Bài viết gốc" sub="Original Essay">
            <p className="text-sm text-navy-400 leading-relaxed whitespace-pre-wrap font-mono text-[12px]">{ev.essay_text}</p>
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
