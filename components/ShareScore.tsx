'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Props = {
  evaluationId: string;
  disabled?: boolean;
};

export function ShareScore({ evaluationId, disabled }: Props) {
  const supabase = createClient();
  const [state, setState] = useState<'idle'|'loading'|'copied'|'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');

  async function handleShare() {
    if (state === 'loading') return;
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
      return;
    }
    setState('loading');
    try {
      const { data: existing } = await supabase
        .from('shares')
        .select('token')
        .eq('evaluation_id', evaluationId)
        .maybeSingle();
      let token = existing?.token;
      if (!token) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: created } = await supabase
          .from('shares')
          .insert({ evaluation_id: evaluationId, user_id: user?.id })
          .select('token')
          .single();
        token = created?.token;
      }
      if (!token) throw new Error('no token');
      const url = window.location.origin + '/share/' + token;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  const labels: Record<string,string> = {
    idle: 'Chia sẻ kết quả',
    loading: 'Đang tạo link...',
    copied: '✓ Đã copy!',
    error: 'Thử lại',
  };

  const cls = state === 'copied'
    ? 'bg-green-500/20 border-green-500/50 text-green-400'
    : state === 'error'
    ? 'bg-red-500/20 border-red-500/50 text-red-400'
    : 'bg-brand-500/15 border-brand-500/40 text-brand-400 hover:bg-brand-500/25';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleShare}
        disabled={disabled || state === 'loading'}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${cls} disabled:opacity-50`}
      >
        {state === 'copied' ? '✓' : '🔗'} {labels[state]}
      </button>
      {shareUrl && state !== 'copied' && (
        <p className="text-[10px] font-mono text-navy-500 truncate max-w-xs">{shareUrl}</p>
      )}
    </div>
  );
}
