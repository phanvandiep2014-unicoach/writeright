'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string; taskType: number; taskPrompt: string | null;
  wordCount: number; overallBand: number;
  taBand: number; ccBand: number; lrBand: number; graBand: number;
  createdAt: string; existingShareToken?: string | null;
};

export function EvalCard({
  id, taskType, taskPrompt, wordCount, overallBand,
  taBand, ccBand, lrBand, graBand, createdAt, existingShareToken,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState(existingShareToken || '');
  const [sharing, setSharing] = useState<'idle'|'loading'|'copied'|'error'>('idle');

  async function getToken(): Promise<string> {
    if (token) return token;
    const r = await fetch('/api/share-token', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ evaluationId: id }),
    });
    const d = await r.json();
    if (d.token) { setToken(d.token); return d.token; }
    throw new Error(d.error || 'failed');
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (sharing === 'loading') return;
    setSharing('loading');
    try {
      const t = await getToken();
      await navigator.clipboard.writeText(`${window.location.origin}/e/${t}`);
      setSharing('copied');
      setTimeout(() => setSharing('idle'), 2500);
    } catch {
      setSharing('error');
      setTimeout(() => setSharing('idle'), 2000);
    }
  }

  async function handleCardClick() {
    try { const t = await getToken(); router.push(`/e/${t}`); } catch {}
  }

  const shareLabel = { idle:'🔗 Chia sẻ', loading:'...', copied:'✓ Đã copy!', error:'Thử lại' }[sharing];
  const date = new Date(createdAt).toLocaleDateString('vi-VN', {day:'2-digit',month:'numeric',year:'numeric'});

  return (
    <div
      onClick={handleCardClick}
      style={{
        background:'rgba(255,255,255,.045)',
        border:'1px solid rgba(200,161,75,.18)',
        borderRadius:16, padding:'20px 22px', cursor:'pointer',
        transition:'border-color .18s, background .18s',
      }}
      onMouseEnter={e=>{
        (e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,161,75,.38)';
        (e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.07)';
      }}
      onMouseLeave={e=>{
        (e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,161,75,.18)';
        (e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.045)';
      }}
    >
      <div style={{display:'flex',alignItems:'flex-start',gap:20}}>

        {/* Left */}
        <div style={{flex:1,minWidth:0}}>
          {/* Meta row */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
            <span style={{
              fontFamily:'var(--font-body)',fontSize:'.72rem',letterSpacing:'.1em',
              textTransform:'uppercase',padding:'3px 10px',borderRadius:20,
              background:'rgba(200,161,75,.12)',border:'1px solid rgba(200,161,75,.3)',color:'#E7CE8E',
            }}>Task {taskType}</span>
            <span style={{fontFamily:'var(--font-body)',fontSize:'.82rem',color:'rgba(231,206,142,.55)'}}>{date}</span>
            {wordCount > 0 && <>
              <span style={{color:'rgba(231,206,142,.25)',fontSize:'.8rem'}}>·</span>
              <span style={{fontFamily:'var(--font-body)',fontSize:'.82rem',color:'rgba(231,206,142,.45)'}}>{wordCount} từ</span>
            </>}
          </div>

          {/* Prompt */}
          {taskPrompt && (
            <p style={{
              fontFamily:'var(--font-body)',fontSize:'.95rem',lineHeight:1.55,
              color:'rgba(231,206,142,.8)',margin:'0 0 14px',
              display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',
            }}>{taskPrompt}</p>
          )}

          {/* Criterion bars */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {([['TA',taBand],['CC',ccBand],['LR',lrBand],['GR',graBand]] as [string,number][]).map(([k,v])=>(
              <div key={k}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontFamily:'var(--font-body)',fontSize:'.72rem',letterSpacing:'.08em',color:'rgba(231,206,142,.5)'}}>{k}</span>
                  <span style={{fontFamily:'var(--font-subhead)',fontSize:'.82rem',fontWeight:700,color:'rgba(231,206,142,.85)'}}>{v}</span>
                </div>
                <div style={{height:5,background:'rgba(255,255,255,.07)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{
                    height:'100%',borderRadius:4,transition:'width .6s ease',
                    width:`${((Number(v)||0)/9)*100}%`,
                    background:'linear-gradient(90deg,#8A6A28,#E7CE8E 50%,#C8A14B)',
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10,minWidth:88}}>
          <div style={{textAlign:'right'}}>
            <p style={{fontFamily:'var(--font-subhead)',fontWeight:700,fontSize:'clamp(32px,5vw,44px)',color:'#fff',margin:0,lineHeight:1}}>{overallBand}</p>
            <p style={{fontFamily:'var(--font-body)',fontSize:'.68rem',letterSpacing:'.12em',color:'rgba(231,206,142,.4)',marginTop:4}}>OVERALL</p>
          </div>
          <button
            onClick={handleShare}
            disabled={sharing==='loading'}
            style={{
              fontFamily:'var(--font-body)',fontSize:'.8rem',
              padding:'6px 14px',borderRadius:8,cursor:'pointer',background:'transparent',
              border:sharing==='copied'?'1px solid rgba(74,222,128,.5)':'1px solid rgba(200,161,75,.3)',
              color:sharing==='copied'?'#4ade80':'rgba(200,161,75,.75)',
              transition:'all .18s',whiteSpace:'nowrap',
            }}
          >{shareLabel}</button>
          <span style={{fontFamily:'var(--font-body)',fontSize:'.75rem',color:'rgba(231,206,142,.3)'}}>Xem chi tiết →</span>
        </div>

      </div>
    </div>
  );
}'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  taskType: number;
  taskPrompt: string | null;
  wordCount: number;
  overallBand: number;
  taBand: number;
  ccBand: number;
  lrBand: number;
  graBand: number;
  createdAt: string;
  existingShareToken?: string | null;
};

// EvalCard — evaluation history card with:
//   • Click anywhere on card → navigate to /e/[token] (full detail)
//   • "Chia sẻ" button → get/create share token → copy URL to clipboard
//
// Uses /api/share-token to get-or-create token lazily.

export function EvalCard({
  id, taskType, taskPrompt, wordCount, overallBand,
  taBand, ccBand, lrBand, graBand, createdAt, existingShareToken,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState(existingShareToken || '');
  const [sharing, setSharing] = useState<'idle'|'loading'|'copied'|'error'>('idle');

  async function getToken(): Promise<string> {
    if (token) return token;
    const r = await fetch('/api/share-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluationId: id }),
    });
    const d = await r.json();
    if (d.token) { setToken(d.token); return d.token; }
    throw new Error(d.error || 'failed');
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (sharing === 'loading') return;
    setSharing('loading');
    try {
      const t = await getToken();
      const url = `${window.location.origin}/e/${t}`;
      await navigator.clipboard.writeText(url);
      setSharing('copied');
      setTimeout(() => setSharing('idle'), 2500);
    } catch {
      setSharing('error');
      setTimeout(() => setSharing('idle'), 2000);
    }
  }

  async function handleCardClick() {
    try {
      const t = await getToken();
      router.push(`/e/${t}`);
    } catch {
      // fallback: still navigate to dashboard
    }
  }

  const shareLabel = { idle:'🔗 Chia sẻ', loading:'...', copied:'✓ Đã copy!', error:'Thử lại' }[sharing];
  const shareClass = sharing === 'copied'
    ? 'border-green-500/50 text-green-400'
    : sharing === 'error'
    ? 'border-red-500/50 text-red-400'
    : 'border-navy-600 text-navy-400 hover:border-brand-500/50 hover:text-brand-400';

  const date = new Date(createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'numeric', year:'numeric' });

  return (
    <div
      onClick={handleCardClick}
      className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 hover:border-navy-600 cursor-pointer transition group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-navy-700 border border-navy-600 text-navy-300">
              Task {taskType}
            </span>
            <span className="text-xs text-navy-500">{date}</span>
            <span className="text-xs text-navy-600">·</span>
            <span className="text-xs text-navy-500">{wordCount} từ</span>
          </div>
          {taskPrompt && (
            <p className="text-sm text-navy-300 line-clamp-2 leading-snug group-hover:text-navy-200 transition">
              {taskPrompt}
            </p>
          )}
          {/* Mini criterion bars */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[['TA',taBand],['CC',ccBand],['LR',lrBand],['GR',graBand]].map(([k,v])=>(
              <div key={k as string}>
                <div className="flex justify-between text-[9px] font-mono text-navy-500 mb-0.5"><span>{k}</span><span>{v}</span></div>
                <div className="h-1 bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width:`${((Number(v)||0)/9)*100}%`,background:'linear-gradient(90deg,#8A6A28,#E7CE8E 50%,#C8A14B)'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-3xl font-bold text-white font-['DM_Serif_Display'] leading-none">{overallBand}</p>
            <p className="text-[9px] text-navy-500 font-mono mt-0.5">OVERALL</p>
          </div>
          <button
            onClick={handleShare}
            disabled={sharing === 'loading'}
            className={`text-xs px-3 py-1.5 rounded-lg border transition font-mono ${shareClass} disabled:opacity-50`}
          >
            {shareLabel}
          </button>
          <span className="text-[10px] text-navy-600 group-hover:text-navy-400 transition font-mono">
            Xem chi tiết →
          </span>
        </div>
      </div>
    </div>
  );
}
