'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { StreakBar } from '@/components/StreakBar';
import { DetailGate } from '@/components/DetailGate';

type Evaluation = {
  id: string;
  task_type: number;
  task_prompt: string;
  overall_band: number;
  ta_band: number;
  lr_band: number;
  gra_band: number;
  cc_band: number;
  word_count: number;
  created_at: string;
  feedback: any;
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Evaluation | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      const { data } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setEvals(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const avgBand = evals.length > 0 ? (evals.reduce((s, e) => s + (e.overall_band || 0), 0) / evals.length).toFixed(1) : '—';
  const totalEvals = evals.length;
  const recentBands = evals.slice(0, 10).map(e => e.overall_band).reverse();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-navy-600 border-t-brand-500 rounded-full animate-spin-slow" style={{ borderWidth: '3px' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-sm">W</div>
            <span className="font-['DM_Serif_Display'] text-lg text-white">Write<span className="text-brand-400">Right</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/evaluate" className="text-sm bg-brand-500 text-navy-900 px-4 py-2 rounded-lg font-medium hover:bg-brand-400 transition">+ Chấm bài mới</Link>
            <button onClick={logout} className="text-xs text-navy-500 hover:text-navy-300 font-mono">Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-8">Dashboard</h1>

        <div className="mb-8">
          <StreakBar />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 text-center">
            <div className="text-xs font-mono tracking-wider uppercase text-navy-400 mb-2">Tổng bài chấm</div>
            <div className="font-['DM_Serif_Display'] text-4xl text-brand-400">{totalEvals}</div>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 text-center">
            <div className="text-xs font-mono tracking-wider uppercase text-navy-400 mb-2">Điểm trung bình</div>
            <div className="font-['DM_Serif_Display'] text-4xl text-brand-400">{avgBand}</div>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 text-center">
            <div className="text-xs font-mono tracking-wider uppercase text-navy-400 mb-2">Điểm cao nhất</div>
            <div className="font-['DM_Serif_Display'] text-4xl text-brand-400">
              {evals.length > 0 ? Math.max(...evals.map(e => e.overall_band || 0)) : '—'}
            </div>
          </div>
        </div>

        {/* Mini chart */}
        {recentBands.length > 1 && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 mb-8">
            <div className="text-xs font-mono tracking-wider uppercase text-brand-400 mb-4">Xu hướng điểm (10 bài gần nhất)</div>
            <div className="flex items-end gap-2 h-24">
              {recentBands.map((band, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-navy-400">{band}</span>
                  <div className="w-full bg-gradient-to-t from-brand-500 to-brand-300 rounded-t" style={{ height: `${(band / 9) * 80}px` }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="text-xs font-mono tracking-widest uppercase text-brand-400 mb-4 flex items-center gap-2">
          Lịch sử chấm điểm <span className="flex-1 h-px bg-navy-700" />
        </div>

        {evals.length === 0 ? (
          <div className="text-center py-16 text-navy-500">
            <p className="text-lg mb-4">Chưa có bài chấm nào</p>
            <Link href="/evaluate" className="text-brand-400 hover:text-brand-300 font-mono text-sm">Chấm bài đầu tiên →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {evals.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 hover:border-brand-500/30 transition text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded">Task {ev.task_type}</span>
                      <span className="text-[10px] font-mono text-navy-500">{new Date(ev.created_at).toLocaleDateString('vi-VN')} · {ev.word_count || '?'} từ</span>
                    </div>
                    <p className="text-sm text-navy-200 truncate">{ev.task_prompt}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-center">
                      <div className="font-['DM_Serif_Display'] text-2xl text-brand-400">{ev.overall_band}</div>
                      <div className="text-[9px] font-mono text-navy-500 uppercase">Overall</div>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {selected?.id === ev.id && ev.feedback && (
  <DetailGate onUpgrade={() => window.location.href='/pricing'}>
                  <div className="mt-4 pt-4 border-t border-navy-700 grid grid-cols-4 gap-3" onClick={(e) => e.stopPropagation()}>
                    {[
                      { label: 'TA', band: ev.ta_band },
                      { label: 'LR', band: ev.lr_band },
                      { label: 'GRA', band: ev.gra_band },
                      { label: 'CC', band: ev.cc_band },
                    ].map((c) => (
                      <div key={c.label} className="text-center">
                        <div className="font-['DM_Serif_Display'] text-lg text-brand-300">{c.band}</div>
                        <div className="text-[9px] font-mono text-navy-500">{c.label}</div>
                      </div>
                    ))}
                  </div>
                </DetailGate>
)}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
