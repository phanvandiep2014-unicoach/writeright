'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Profile={id:string;full_name:string|null;avatar_url:string|null;tier:string;};
type PubEval={id:string;overall_band:number;ta_band:number;cc_band:number;lr_band:number;gra_band:number;task_type:number;task_prompt:string|null;created_at:string;share_token:string;};
type Reaction={eval_id:string;emoji:string;count:number;};

const EMOJIS=['🔥','👏','🎯'];

export default function PublicProfilePage(){
  const supabase=createClient();
  const {token}=useParams<{token:string}>();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [evals,setEvals]=useState<PubEval[]>([]);
  const [reactions,setReactions]=useState<Record<string,Record<string,number>>>({});
  const [myReacts,setMyReacts]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
  const [copied,setCopied]=useState('');

  useEffect(()=>{
    (async()=>{
      try {
        // Lookup profile by public_token stored in profiles
        const {data:prof}=await supabase
          .from('profiles')
          .select('id,full_name,avatar_url,tier')
          .eq('public_token',token)
          .maybeSingle();
        if(!prof){setNotFound(true);setLoading(false);return;}
        setProfile(prof);

        // Load their publicly shared evaluations
        const {data:evs}=await supabase
          .from('shares')
          .select('token, evaluations(id,overall_band,ta_band,cc_band,lr_band,gra_band,task_type,task_prompt,created_at)')
          .eq('user_id',prof.id)
          .order('created_at',{ascending:false})
          .limit(20);

        const flat=(evs||[]).map((s:any)=>({...s.evaluations, share_token:s.token})).filter(Boolean);
        setEvals(flat);

        // Load reactions
        if(flat.length){
          const ids=flat.map((e:PubEval)=>e.id);
          const {data:rxs}=await supabase
            .from('eval_reactions')
            .select('eval_id,emoji,count')
            .in('eval_id',ids);
          const map:Record<string,Record<string,number>>={};
          (rxs||[]).forEach((r:Reaction)=>{ if(!map[r.eval_id]) map[r.eval_id]={}; map[r.eval_id][r.emoji]=r.count; });
          setReactions(map);
        }
      } catch(e){ console.error('public profile error',e); setNotFound(true); }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[token]);

  const react=useCallback(async(evalId:string,emoji:string)=>{
    const prev=myReacts[evalId];
    if(prev===emoji) return; // already reacted with same emoji
    setMyReacts(p=>({...p,[evalId]:emoji}));
    setReactions(prev=>{
      const cur={...prev[evalId]};
      if(prev[evalId]?.[emoji]) cur[emoji]=(cur[emoji]||0)+1;
      else cur[emoji]=(cur[emoji]||0)+1;
      return {...prev,[evalId]:cur};
    });
    await supabase.rpc('upsert_eval_reaction',{p_eval_id:evalId,p_emoji:emoji});
  },[myReacts,supabase]);

  const shareProfile=async()=>{
    await navigator.clipboard.writeText(window.location.href);
    setCopied('profile');
    setTimeout(()=>setCopied(''),2000);
  };

  const shareEval=async(shareToken:string)=>{
    const url=`${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(shareToken);
    setTimeout(()=>setCopied(''),2000);
  };

  if(loading) return(
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <p className="text-navy-400 text-sm animate-pulse">Đang tải hồ sơ...</p>
    </div>
  );
  if(notFound) return(
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-navy-200 font-medium">Hồ sơ không tồn tại</p>
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300 mt-3 inline-block">← WriteRight</Link>
      </div>
    </div>
  );

  const avgBand=evals.length ? (evals.reduce((s,e)=>s+e.overall_band,0)/evals.length).toFixed(1) : null;
  const maxBand=evals.length ? Math.max(...evals.map(e=>e.overall_band)).toFixed(1) : null;

  return(
    <div className="min-h-screen bg-navy-900">
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-xs">W</div>
            <span className="text-white text-sm font-semibold">Write<span className="text-brand-400">Right</span></span>
          </Link>
          <button onClick={shareProfile} className="text-xs font-mono text-navy-400 hover:text-brand-400 transition px-3 py-1.5 border border-navy-700 rounded-lg hover:border-navy-600">
            {copied==='profile'?'✓ Đã copy!':'🔗 Chia sẻ hồ sơ'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Profile card */}
        <div className="flex items-center gap-5 mb-8">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="w-20 h-20 rounded-full border-2 border-brand-500/50 object-cover shrink-0"/>
            : <div className="w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500/40 flex items-center justify-center text-brand-400 text-2xl font-['DM_Serif_Display'] shrink-0">
                {(profile?.full_name||'?').charAt(0).toUpperCase()}
              </div>
          }
          <div>
            <h1 className="text-2xl text-white font-['DM_Serif_Display']">{profile?.full_name||'IELTS Writer'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${profile?.tier==='premium'?'bg-brand-500/15 border-brand-500/50 text-brand-400':'text-navy-400 border-navy-600 bg-navy-800'}`}>
                {profile?.tier==='premium'?'✦ Premium':profile?.tier==='standard'?'Standard':'Free'}
              </span>
              {avgBand&&<span className="text-xs text-navy-400 font-mono">avg {avgBand} band</span>}
              {maxBand&&<span className="text-xs text-navy-400 font-mono">max {maxBand}</span>}
              <span className="text-xs text-navy-500 font-mono">{evals.length} bài đã chia sẻ</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {evals.length>0&&(
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              {label:'Tổng bài chia sẻ', val:evals.length},
              {label:'Điểm trung bình', val:avgBand||'—'},
              {label:'Điểm cao nhất', val:maxBand||'—'},
            ].map(s=>(
              <div key={s.label} className="bg-navy-800 border border-navy-700 rounded-xl p-4 text-center">
                <p className="text-2xl text-white font-['DM_Serif_Display']">{s.val}</p>
                <p className="text-xs text-navy-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Evaluations */}
        <h2 className="text-xs font-mono text-navy-400 uppercase tracking-widest mb-4">Bài viết đã chia sẻ</h2>

        {evals.length===0 ? (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-10 text-center">
            <p className="text-3xl mb-3">📝</p>
            <p className="text-navy-300">Chưa có bài viết nào được chia sẻ.</p>
          </div>
        ):(
          <div className="space-y-4">
            {evals.map(ev=>(
              <div key={ev.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-navy-600 transition">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${ev.task_type===1?'border-teal-700 text-teal-400 bg-teal-900/20':'border-blue-700 text-blue-400 bg-blue-900/20'}`}>
                        Task {ev.task_type}
                      </span>
                      <span className="text-xs text-navy-500">{new Date(ev.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {ev.task_prompt&&<p className="text-sm text-navy-300 line-clamp-2">{ev.task_prompt}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-3xl font-['DM_Serif_Display'] text-white leading-none">{ev.overall_band}</p>
                    <p className="text-[10px] text-navy-500 font-mono mt-0.5">BAND</p>
                  </div>
                </div>

                {/* Mini criterion bars */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[['TA',ev.ta_band],['CC',ev.cc_band],['LR',ev.lr_band],['GR',ev.gra_band]].map(([k,v])=>(
                    <div key={k as string}>
                      <div className="flex justify-between text-[10px] font-mono text-navy-500 mb-0.5"><span>{k}</span><span>{v}</span></div>
                      <div className="h-1 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500/60 rounded-full" style={{width:`${((Number(v)||0)/9)*100}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reactions + share */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {EMOJIS.map(emoji=>(
                      <button key={emoji} onClick={()=>react(ev.id,emoji)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition ${myReacts[ev.id]===emoji?'bg-brand-500/20 border border-brand-500/40':'bg-navy-700 border border-transparent hover:border-navy-600'}`}>
                        {emoji}
                        {(reactions[ev.id]?.[emoji]||0)>0&&<span className="text-[10px] text-navy-400 font-mono">{reactions[ev.id][emoji]}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/share/${ev.share_token}`} target="_blank" className="text-xs text-navy-400 hover:text-brand-400 transition font-mono">Xem phiếu →</Link>
                    <button onClick={()=>shareEval(ev.share_token)} className="text-xs text-navy-500 hover:text-navy-300 transition font-mono">
                      {copied===ev.share_token?'✓ Đã copy':'copy link'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/evaluate" className="inline-block px-6 py-3 rounded-xl bg-brand-500 text-navy-900 font-semibold text-sm hover:bg-brand-400 transition">
            Chấm bài IELTS Writing của bạn →
          </Link>
        </div>
      </main>
    </div>
  );
}
