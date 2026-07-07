'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { StreakBar } from '@/components/StreakBar';
import { EvalCard } from '@/components/EvalCard';

type Evaluation = {
  id: string; task_type: number; task_prompt: string | null;
  word_count: number; overall_band: number;
  ta_band: number; cc_band: number; lr_band: number; gra_band: number;
  created_at: string;
};

function Crest({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size*1.21)} viewBox="330 70 420 480" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="cgD" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6A28"/><stop offset=".28" stopColor="#E7CE8E"/>
          <stop offset=".52" stopColor="#C8A14B"/><stop offset=".74" stopColor="#F4E7BC"/>
          <stop offset="1" stopColor="#9A7A2E"/>
        </linearGradient>
        <linearGradient id="cfD" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2552"/><stop offset="1" stopColor="#0B1029"/>
        </linearGradient>
      </defs>
      <path d="M462 182 L494 132 L520 160 L540 112 L560 160 L586 132 L618 182 Z" fill="url(#cgD)"/>
      <circle cx="494" cy="129" r="6.5" fill="url(#cgD)"/><circle cx="586" cy="129" r="6.5" fill="url(#cgD)"/>
      <circle cx="540" cy="108" r="7" fill="url(#cgD)"/>
      <path d="M540 92 v16 M531 100 h18" stroke="url(#cgD)" strokeWidth="4.5" strokeLinecap="round"/>
      <rect x="460" y="182" width="160" height="17" rx="4" fill="url(#cfD)" stroke="url(#cgD)" strokeWidth="4"/>
      <circle cx="500" cy="190.5" r="3.4" fill="url(#cgD)"/><circle cx="540" cy="190.5" r="3.4" fill="url(#cgD)"/><circle cx="580" cy="190.5" r="3.4" fill="url(#cgD)"/>
      <g fill="url(#cgD)">
        <path d="M420 488 C372 446 360 360 388 256" stroke="url(#cgD)" strokeWidth="5" fill="none"/>
        <ellipse cx="378" cy="300" rx="18" ry="8" transform="rotate(40 378 300)"/>
        <ellipse cx="372" cy="348" rx="18" ry="8" transform="rotate(28 372 348)"/>
        <ellipse cx="376" cy="396" rx="18" ry="8" transform="rotate(14 376 396)"/>
        <ellipse cx="392" cy="440" rx="18" ry="8" transform="rotate(-2 392 440)"/>
        <path d="M660 488 C708 446 720 360 692 256" stroke="url(#cgD)" strokeWidth="5" fill="none"/>
        <ellipse cx="702" cy="300" rx="18" ry="8" transform="rotate(-40 702 300)"/>
        <ellipse cx="708" cy="348" rx="18" ry="8" transform="rotate(-28 708 348)"/>
        <ellipse cx="704" cy="396" rx="18" ry="8" transform="rotate(-14 704 396)"/>
        <ellipse cx="688" cy="440" rx="18" ry="8" transform="rotate(2 688 440)"/>
      </g>
      <path d="M432 214 L648 214 L648 330 C648 416 596 466 540 496 C484 466 432 416 432 330 Z" fill="url(#cfD)" stroke="url(#cgD)" strokeWidth="6.5"/>
      <path d="M448 230 L632 230 L632 330 C632 405 586 451 540 474 C494 451 448 405 448 330 Z" fill="none" stroke="url(#cgD)" strokeWidth="1.6"/>
      <g fill="url(#cgD)">
        <path d="M484 250 l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>
        <path d="M540 246 l5.5 12 13 1-10 8.5 3.2 13-11.7-6.4-11.7 6.4 3.2-13-10-8.5 13-1z"/>
        <path d="M596 250 l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>
      </g>
      <g stroke="url(#cgD)" strokeWidth="3.4" strokeLinecap="round">
        <path d="M540 318 v-16"/><path d="M508 326 l-10-12"/><path d="M572 326 l10-12"/>
        <path d="M486 344 l-13-6"/><path d="M594 344 l13-6"/>
      </g>
      <g stroke="url(#cgD)" strokeWidth="4" fill="#0B1029" strokeLinejoin="round">
        <path d="M540 352 C508 340 476 343 458 352 L458 422 C476 412 508 410 540 422 Z"/>
        <path d="M540 352 C572 340 604 343 622 352 L622 422 C604 412 572 410 540 422 Z"/>
        <path d="M540 352 V422" fill="none"/>
        <g strokeWidth="2.2">
          <path d="M472 372 q24-7 56 1"/><path d="M472 388 q24-7 56 1"/>
          <path d="M552 373 q24-7 56 1"/><path d="M552 389 q24-7 56 1"/>
        </g>
      </g>
      <path d="M368 486 L400 478 L400 524 L368 532 L382 509 Z" fill="#3A0E18" stroke="url(#cgD)" strokeWidth="3"/>
      <path d="M712 486 L680 478 L680 524 L712 532 L698 509 Z" fill="#3A0E18" stroke="url(#cgD)" strokeWidth="3"/>
      <path d="M396 478 L684 478 L684 524 L540 534 L396 524 Z" fill="#5A1726" stroke="url(#cgD)" strokeWidth="3.5"/>
      <text x="540" y="511" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="700" fontSize="24" letterSpacing="1.5" fill="url(#cgD)">PER TE · AD ASTRA</text>
    </svg>
  );
}

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState({ total: 0, avg: 0, max: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login?next=/dashboard'; return; }
      setUser(user);
      const { data: prof } = await supabase.from('profiles')
        .select('full_name,avatar_url,tier,public_token,role').eq('id', user.id).single();
      setProfile(prof);
      const { data: evs } = await supabase.from('evaluations')
        .select('id,task_type,task_prompt,word_count,overall_band,ta_band,cc_band,lr_band,gra_band,created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      const list = evs || [];
      setEvaluations(list);
      if (list.length > 0) {
        const bands = list.map(e => e.overall_band).filter(Boolean);
        setStats({
          total: list.length,
          avg: bands.length ? Math.round((bands.reduce((a,b)=>a+b,0)/bands.length)*10)/10 : 0,
          max: bands.length ? Math.max(...bands) : 0,
        });
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const tierLabel = profile?.tier === 'premium' ? 'Premium' : profile?.tier === 'standard' ? 'Standard' : 'Free';
  const tierStyle: React.CSSProperties = (profile?.tier === 'premium' || profile?.tier === 'standard')
    ? { background:'rgba(200,161,75,.15)', border:'1px solid rgba(200,161,75,.45)', color:'#E7CE8E' }
    : { background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(231,206,142,.55)' };

  return (
    <div className="min-h-screen" style={{ background:'var(--royal-sapphire)' }}>

      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="app-logo-link" aria-label="WriteRight home">
            <Crest size={32}/>
            <span className="app-logo-wordmark hidden sm:inline">
              Write<span className="gold-foil">Right</span>
            </span>
          </Link>
          <Link href="/courses" className="app-nav-link">Khóa học</Link>
          {(profile?.role==='admin'||profile?.role==='teacher') && (
            <Link href="/admin/courses" className="app-nav-link" style={{fontSize:'.8rem',opacity:.7}}>⚙ Admin</Link>
          )}
          <div style={{flex:1}}/>
          <Link href="/evaluate" style={{
            fontFamily:'var(--font-body)', fontSize:'.9rem', fontWeight:600,
            padding:'8px 18px', borderRadius:8, textDecoration:'none', whiteSpace:'nowrap',
            background:'linear-gradient(135deg,#8A6A28,#E7CE8E 40%,#C8A14B 65%,#A9863A)',
            color:'#11183A', transition:'opacity .18s',
          }}>+ Chấm bài mới</Link>
          <button onClick={handleSignOut} className="app-nav-link"
            style={{background:'none',border:'none',cursor:'pointer',fontSize:'.85rem'}}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main style={{maxWidth:960,margin:'0 auto',padding:'40px 20px 80px'}}>

        <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:36}}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(200,161,75,.5)'}}/>
            : <div style={{width:72,height:72,borderRadius:'50%',flexShrink:0,background:'rgba(200,161,75,.12)',border:'2px solid rgba(200,161,75,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-subhead)',fontSize:28,color:'#E7CE8E'}}>
                {(profile?.full_name||user?.email||'W').charAt(0).toUpperCase()}
              </div>
          }
          <div>
            <h1 style={{fontFamily:'var(--font-subhead)',fontWeight:700,fontSize:'clamp(24px,4vw,34px)',color:'#fff',margin:'0 0 6px',lineHeight:1.2}}>
              {profile?.full_name||'Dashboard'}
            </h1>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span style={{fontFamily:'var(--font-body)',fontSize:'.88rem',color:'rgba(231,206,142,.6)'}}>{user?.email}</span>
              <span style={{fontFamily:'var(--font-body)',fontSize:'.75rem',fontWeight:600,padding:'2px 10px',borderRadius:20,letterSpacing:'.04em',...tierStyle}}>{tierLabel}</span>
              {profile?.public_token && (
                <a href={`/p/${profile.public_token}`} target="_blank" rel="noopener noreferrer"
                  style={{fontFamily:'var(--font-body)',fontSize:'.8rem',color:'rgba(200,161,75,.6)',textDecoration:'none'}}>
                  🔗 hồ sơ công khai
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{marginBottom:32}}><StreakBar/></div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:36}}>
          {[
            {label:'TỔNG BÀI CHẤM', value:stats.total||(loading?'…':0)},
            {label:'ĐIỂM TRUNG BÌNH', value:stats.avg||(loading?'…':'—')},
            {label:'ĐIỂM CAO NHẤT', value:stats.max||(loading?'…':'—')},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(200,161,75,.18)',borderRadius:14,padding:'22px 16px',textAlign:'center'}}>
              <p style={{fontFamily:'var(--font-subhead)',fontSize:'clamp(28px,5vw,42px)',fontWeight:700,color:'#fff',margin:0,lineHeight:1}}>{s.value}</p>
              <p style={{fontFamily:'var(--font-body)',fontSize:'.7rem',letterSpacing:'.12em',color:'rgba(231,206,142,.5)',marginTop:8}}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <h2 style={{fontFamily:'var(--font-body)',fontSize:'.75rem',letterSpacing:'.14em',color:'rgba(200,161,75,.6)',textTransform:'uppercase',margin:0}}>Lịch sử chấm điểm</h2>
          {evaluations.length>0 && <span style={{fontFamily:'var(--font-body)',fontSize:'.75rem',color:'rgba(231,206,142,.35)'}}>Click vào bài để xem chi tiết</span>}
        </div>

        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[1,2,3].map(i=><div key={i} style={{height:100,background:'rgba(255,255,255,.04)',borderRadius:14,border:'1px solid rgba(200,161,75,.1)'}}/>)}
          </div>
        ) : evaluations.length===0 ? (
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(200,161,75,.15)',borderRadius:16,padding:'52px 24px',textAlign:'center'}}>
            <p style={{fontSize:36,marginBottom:12}}>📝</p>
            <p style={{fontFamily:'var(--font-subhead)',fontSize:'1.15rem',color:'#E7CE8E',marginBottom:8}}>Chưa có bài chấm nào</p>
            <Link href="/evaluate" style={{fontFamily:'var(--font-body)',fontSize:'.9rem',color:'rgba(200,161,75,.75)',textDecoration:'none'}}>Chấm bài đầu tiên →</Link>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {evaluations.map(ev=>(
              <EvalCard key={ev.id} id={ev.id} taskType={ev.task_type} taskPrompt={ev.task_prompt}
                wordCount={ev.word_count} overallBand={ev.overall_band}
                taBand={ev.ta_band} ccBand={ev.cc_band} lrBand={ev.lr_band} graBand={ev.gra_band}
                createdAt={ev.created_at}/>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { StreakBar } from '@/components/StreakBar';
import { EvalCard } from '@/components/EvalCard';

type Evaluation = {
  id: string;
  task_type: number;
  task_prompt: string | null;
  word_count: number;
  overall_band: number;
  ta_band: number;
  cc_band: number;
  lr_band: number;
  gra_band: number;
  created_at: string;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState({ total: 0, avg: 0, max: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login?next=/dashboard'; return; }
      setUser(user);

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, tier, public_token, role')
        .eq('id', user.id)
        .single();
      setProfile(prof);

      const { data: evs } = await supabase
        .from('evaluations')
        .select('id,task_type,task_prompt,word_count,overall_band,ta_band,cc_band,lr_band,gra_band,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const list = evs || [];
      setEvaluations(list);

      if (list.length > 0) {
        const bands = list.map(e => e.overall_band).filter(Boolean);
        setStats({
          total: list.length,
          avg: bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10 : 0,
          max: bands.length ? Math.max(...bands) : 0,
        });
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-xs">W</div>
            <span className="text-white text-sm font-semibold hidden sm:block">Write<span className="text-brand-400">Right</span></span>
          </Link>
          <Link href="/courses" className="text-sm text-navy-400 hover:text-white transition font-mono">Khóa học</Link>
          {profile?.role === 'admin' || profile?.role === 'teacher' ? (
            <Link href="/admin/courses" className="text-xs text-navy-500 hover:text-brand-400 transition font-mono">⚙ Admin</Link>
          ) : null}
          <div className="flex-1"/>
          <Link href="/evaluate" className="text-sm bg-brand-500 text-navy-900 px-4 py-2 rounded-lg font-medium hover:bg-brand-400 transition">+ Chấm bài mới</Link>
          <button onClick={handleSignOut} className="text-xs text-navy-400 hover:text-white transition font-mono">Đăng xuất</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full border-2 border-brand-500/60 object-cover"/>
            : <div className="w-16 h-16 rounded-full bg-brand-500/20 border-2 border-brand-500/60 flex items-center justify-center text-brand-400 text-2xl font-['DM_Serif_Display']">
                {(profile?.full_name || user?.email || 'W').charAt(0).toUpperCase()}
              </div>
          }
          <div>
            <h1 className="font-['DM_Serif_Display'] text-3xl text-white leading-tight">{profile?.full_name || 'Dashboard'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-navy-400 font-mono">{user?.email}</span>
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${profile?.tier === 'premium' || profile?.tier === 'standard' ? 'bg-brand-500/15 border-brand-500/50 text-brand-400' : 'bg-navy-700 border-navy-600 text-navy-300'}`}>
                {profile?.tier === 'premium' ? 'Premium' : profile?.tier === 'standard' ? 'Standard' : 'Free'}
              </span>
              {profile?.public_token && (
                <a href={`/p/${profile.public_token}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-navy-500 hover:text-brand-400 transition">🔗 hồ sơ công khai</a>
              )}
            </div>
          </div>
        </div>

        {/* Streak bar */}
        <div className="mb-8">
          <StreakBar />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'TỔNG BÀI CHẤM', value: stats.total || (loading ? '…' : 0) },
            { label: 'ĐIỂM TRUNG BÌNH', value: stats.avg || (loading ? '…' : '—') },
            { label: 'ĐIỂM CAO NHẤT', value: stats.max || (loading ? '…' : '—') },
          ].map(s => (
            <div key={s.label} className="bg-navy-800 border border-navy-700 rounded-xl p-5 text-center">
              <p className="text-3xl text-white font-['DM_Serif_Display']">{s.value}</p>
              <p className="text-[10px] font-mono text-navy-400 mt-1 tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Evaluation history */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-mono text-navy-400 uppercase tracking-widest">Lịch sử chấm điểm</h2>
          {evaluations.length > 0 && (
            <span className="text-[10px] text-navy-600 font-mono">Click vào bài để xem chi tiết</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-navy-800 border border-navy-700 rounded-xl animate-pulse"/>)}
          </div>
        ) : evaluations.length === 0 ? (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-10 text-center">
            <p className="text-3xl mb-3">📝</p>
            <p className="text-navy-300 font-medium">Chưa có bài chấm nào</p>
            <Link href="/evaluate" className="text-sm text-brand-400 hover:text-brand-300 font-mono mt-2 inline-block">Chấm bài đầu tiên →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map(ev => (
              <EvalCard
                key={ev.id}
                id={ev.id}
                taskType={ev.task_type}
                taskPrompt={ev.task_prompt}
                wordCount={ev.word_count}
                overallBand={ev.overall_band}
                taBand={ev.ta_band}
                ccBand={ev.cc_band}
                lrBand={ev.lr_band}
                graBand={ev.gra_band}
                createdAt={ev.created_at}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
