'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Lesson = {
  id: string;
  title: string;
  summary: string | null;
  sort_order: number;
};

type Progress = { lesson_id: string; status: string };

export default function CourseDetailPage() {
  const supabase = createClient();
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const [courseTitle, setCourseTitle] = useState('');
  const [bandLevel, setBandLevel] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: course } = await supabase
          .from('courses')
          .select('title, band_level')
          .eq('id', params.courseId)
          .single();
        if (course) {
          setCourseTitle(course.title);
          setBandLevel(Number(course.band_level));
        }

        const { data: ls, error } = await supabase
          .from('lessons')
          .select('id, title, summary, sort_order')
          .eq('course_id', params.courseId)
          .eq('is_published', true)
          .order('sort_order', { ascending: true });

        if (error || !ls || ls.length === 0) {
          const { data: prof } = await supabase
            .from('profiles').select('tier, role').eq('id', user.id).single();
          const premium = prof && (prof.tier === 'premium' || prof.role === 'teacher' || prof.role === 'admin');
          if (!premium) setLocked(true);
        }
        setLessons(ls || []);

        const { data: prog } = await supabase
          .from('lesson_progress')
          .select('lesson_id, status')
          .eq('user_id', user.id);
        const map: Record<string, string> = {};
        (prog || []).forEach((p: Progress) => { map[p.lesson_id] = p.status; });
        setProgress(map);
      } catch (e) {
        console.error('course detail error', e);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.courseId]);

  return (
    <div className="min-h-screen bg-navy-900">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/courses" className="text-xs text-navy-400 hover:text-brand-400 transition">← Lộ trình</Link>
        <div className="flex items-center gap-4 mt-4 mb-8">
          {bandLevel !== null && (
            <div className="w-14 h-14 shrink-0 rounded-full bg-brand-500/15 border border-brand-500/40 flex items-center justify-center font-['DM_Serif_Display'] text-brand-400 text-lg">
              {bandLevel.toFixed(1)}
            </div>
          )}
          <h1 className="font-['DM_Serif_Display'] text-2xl text-white">{courseTitle || 'Khóa học'}</h1>
        </div>

        {loading ? (
          <p className="text-navy-400 text-sm">Đang tải bài học...</p>
        ) : locked ? (
          <div className="bg-navy-800 border border-brand-500/30 rounded-xl p-10 text-center">
            <p className="text-2xl mb-3">🔒</p>
            <p className="text-navy-200 font-medium">Nội dung dành cho học viên Premium</p>
            <p className="text-sm text-navy-400 mt-1 mb-5">Nâng cấp để mở toàn bộ lộ trình band 5.0 → 8.0.</p>
            <Link href="/pricing" className="inline-block px-6 py-2.5 rounded-lg bg-brand-500 text-navy-900 font-semibold text-sm hover:bg-brand-400 transition">Xem gói Premium</Link>
          </div>
        ) : lessons.length === 0 ? (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center">
            <p className="text-navy-300">Bài học đang được biên soạn.</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {lessons.map((l, i) => {
              const st = progress[l.id];
              return (
                <li key={l.id}>
                  <Link href={`/learn/${l.id}`} className="flex items-center gap-4 bg-navy-800 border border-navy-700 rounded-xl p-4 hover:border-brand-500/50 transition">
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-mono border ${st === 'completed' ? 'bg-brand-500/20 border-brand-500/60 text-brand-400' : 'bg-navy-700 border-navy-600 text-navy-300'}`}>
                      {st === 'completed' ? '✓' : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{l.title}</p>
                      {l.summary && <p className="text-xs text-navy-400 mt-0.5 truncate">{l.summary}</p>}
                    </div>
                    {st && st !== 'completed' && (
                      <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-navy-400">Đang học</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
