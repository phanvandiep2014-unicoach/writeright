'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

type Course = {
  id: string;
  title: string;
  description: string | null;
  band_level: number;
  sort_order: number;
};

export default function CoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('tier, role')
            .eq('id', user.id)
            .single();
          if (prof && (prof.tier === 'premium' || prof.role === 'teacher' || prof.role === 'admin')) {
            setIsPremium(true);
          }
        }
        const { data } = await supabase
          .from('courses')
          .select('id, title, description, band_level, sort_order')
          .eq('is_published', true)
          .order('band_level', { ascending: true })
          .order('sort_order', { ascending: true });
        setCourses(data || []);
      } catch (e) {
        console.error('courses load error', e);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-navy-900">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-xs font-mono tracking-[0.3em] text-brand-400 uppercase mb-2">UNICOACH Learning Path</p>
        <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-2">Lộ trình IELTS Writing</h1>
        <p className="text-sm text-navy-400 mb-10">Band ladder 5.0 → 8.0 — học kỹ thuật, viết bài, được AI chấm ngay trong từng bài học.</p>

        {loading ? (
          <p className="text-navy-400 text-sm">Đang tải lộ trình...</p>
        ) : courses.length === 0 ? (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-10 text-center">
            <p className="text-2xl mb-3">📚</p>
            <p className="text-navy-200 font-medium">Khóa học đang được biên soạn</p>
            <p className="text-sm text-navy-400 mt-1">Lộ trình band 5.0 → 8.0 sẽ ra mắt sớm. Quay lại nhé!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={isPremium ? `/courses/${c.id}` : '/pricing'}
                className="block bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-brand-500/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 shrink-0 rounded-full bg-brand-500/15 border border-brand-500/40 flex items-center justify-center font-['DM_Serif_Display'] text-brand-400 text-lg">
                    {Number(c.band_level).toFixed(1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-semibold">{c.title}</h2>
                    {c.description && <p className="text-sm text-navy-400 mt-0.5">{c.description}</p>}
                  </div>
                  {!isPremium && (
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-navy-700 border border-navy-600 text-navy-300">
                      🔒 Premium
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
