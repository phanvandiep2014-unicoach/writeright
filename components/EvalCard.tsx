'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

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
};

export function EvalCard({ id, taskType, taskPrompt, wordCount, overallBand, taBand, ccBand, lrBand, graBand, createdAt }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [token, setToken] = useState('');
  const [sharing, setSharing] = useState<'idle'|'loading'|'copied'|'error'>('idle');
  const [navigating, setNavigating] = useState(false);

  async function getJWT(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }

  async function getToken(): Promise<string> {
    if (token) return token;
    const jwt = await getJWT();
    const r = await fetch('/api/share-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
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
    if (navigating) return;
    setNavigating(true);
    try {
      const t = await getToken();
      router.push(`/e/${t}`);
    } catch {
      setNavigating(false);
    }
  }

  const shareLabel = { idle:'🔗 Chia sẻ', loading:'...', copied:'✓ Đã copy!', error:'Thử lại' }[sharing];
  const shareClass = sharing === 'copied'
    ? 'border-green-500/50 text-green-400'
    : sharing === 'error' ? 'border-red-500/50 text-red-400'
    : 'border-navy-600 text-navy-400 hover:border-brand-500/50 hover:text-brand-400';

  const date = new Date(createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'numeric', year:'numeric' });

  return (
    <div onClick={handleCardClick} className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 hover:border-navy-600 cursor-pointer transition group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-navy-700 border border-navy-600 text-navy-300">Task {taskType}</span>
            <span className="text-xs text-navy-500">{date}</span>
            {wordCount ? <span className="text-xs text-navy-600">·</span> : null}
            {wordCount ? <span className="text-xs text-navy-500">{wordCount} từ</span> : null}
          </div>
          <p className="text-sm text-navy-300 line-clamp-2 leading-snug group-hover:text-navy-200 transition">{taskPrompt || (taskType === 1 ? 'Bài Task 1 (đề không được lưu)' : 'Bài Task 2 (đề không được lưu)')}</p>
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
          <button onClick={handleShare} disabled={sharing==='loading'} className={`text-xs px-3 py-1.5 rounded-lg border transition font-mono ${shareClass} disabled:opacity-50`}>{shareLabel}</button>
          <span className="text-[10px] text-navy-600 group-hover:text-navy-400 transition font-mono">{navigating?'Đang mở...':'Xem chi tiết →'}</span>
        </div>
      </div>
    </div>
  );
}
