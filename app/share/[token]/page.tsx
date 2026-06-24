import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

type SharedEval = {
  task_type: number;
  task_prompt: string;
  overall_band: number;
  ta_band: number;
  lr_band: number;
  gra_band: number;
  cc_band: number;
  word_count: number;
  created_at: string;
  sharer_name: string;
  sharer_avatar: string;
};

async function getSharedEvaluation(token: string): Promise<SharedEval | null> {  const cookieStore = cookies();
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

  const { data, error } = await supabase.rpc('get_shared_evaluation', { share_token: token });
  if (error || !data || data.length === 0) return null;
  return data[0] as SharedEval;
}

const CRITERIA = [
  { key: 'ta_band', label: 'Task Achievement' },
  { key: 'lr_band', label: 'Lexical Resource' },
  { key: 'gra_band', label: 'Grammar Range' },
  { key: 'cc_band', label: 'Coherence & Cohesion' },
] as const;

export default async function SharedScorecardPage({ params }: { params: { token: string } }) {
  const ev = await getSharedEvaluation(params.token);

  if (!ev) {
    return (
      <div style={{ background: 'var(--parchment)', minHeight: '100vh' }} className="flex items-center justify-center px-4">
        <div className="text-center" style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)' }}>
          <p className="text-xl mb-2">Liên kết này không còn tồn tại hoặc đã hết han.</p>
          <Link href="/" className="gold-foil font-semibold">Về WriteRight →</Link>
        </div>
      </div>
    );
  }

  const initial = (ev.sharer_name || '?').charAt(0).toUpperCase();

  return (
    <div style={{ background: 'var(--parchment)', minHeight: '100vh' }} className="px-4 py-12">
      <div
        className="max-w-xl mx-auto rounded-2xl overflow-hidden"
        style={{ background: 'var(--ivory)', boxShadow: 'var(--shadow-card)', border: 'var(--hairline)' }}
      >
        {/* Gold header */}
        <div style={{ background: 'var(--royal-sapphire)' }} className="px-8 py-6 text-center relative">
          <div className="gold-rule absolute top-0 left-0 right-0" />
          <span className="eyebrow" style={{ color: 'var(--champagne)' }}>WriteRight × UNICOACH</span>
          <p className="heading-vi text-2xl mt-2" style={{ color: 'var(--ivory)' }}>Kết quả chấm IELTS Writing</p>
        </div>

        <div className="px-8 py-8">
          {/* Sharer identity */}
          <div className="flex items-center gap-3 mb-6">
            {ev.sharer_avatar ? (
              <img src={ev.sharer_avatar} alt="" className="w-11 h-11 rounded-full object-cover" style={{ border: '2px solid var(--champagne)' }} />
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-semibold"
                style={{ background: 'var(--gold-foil)', color: 'var(--royal-sapphire)' }}
              >
                {initial}
              </div>
            )}
            <div>
              <p className="font-semibold" style={{ fontFamily: 'var(--font-subhead)', color: 'var(--royal-sapphire)' }}>
                {ev.sharer_name || 'Học viên WriteRight'}
              </p>
              <p className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', opacity: 0.7 }}>
                {new Date(ev.created_at).toLocaleDateString('vi-VN')} · Task {ev.task_type} · {ev.word_count} từ
              </p>
            </div>
          </div>

          {/* Prompt */}
          <p
            className="mb-6 text-sm italic"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', opacity: 0.85 }}
          >
            "{ev.task_prompt}"
          </p>

          {/* Overall band — the hero number */}
          <div className="text-center mb-8 py-6" style={{ borderTop: 'var(--hairline)', borderBottom: 'var(--hairline)' }}>
            <p className="eyebrow mb-2">Overall Band</p>
            <p className="gold-foil" style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', fontWeight: 700, lineHeight: 1 }}>
              {ev.overall_band}
            </p>
          </div>

          {/* Criteria breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {CRITERIA.map((c) => (
              <div key={c.key} className="text-center rounded-xl py-4" style={{ background: 'var(--parchment)' }}>
                <p className="heading-vi text-xl" style={{ color: 'var(--royal-oxblood)' }}>
                  {(ev as any)[c.key]}
                </p>
                <p className="text-[11px] mt-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--sepia-ink)', opacity: 0.75 }}>
                  {c.label}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/" className="btn-royal inline-block">
              Tự chấm bài Writing miễn phí
            </Link>
            <p className="eyebrow mt-4">Per te, ad astra</p>
          </div>
        </div>
      </div>
    </div>
  );
}
