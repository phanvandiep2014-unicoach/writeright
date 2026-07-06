'use client';
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
