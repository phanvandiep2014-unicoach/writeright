'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  summary: string | null;
  video_url: string | null;
  content_md: string | null;
  writing_task_prompt: string | null;
  task_type: string;
};

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
  } catch {}
  return url;
}

export default function LessonPage() {
  const supabase = createClient();
  const params = useParams<{ lessonId: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: ls, error } = await supabase
          .from('lessons')
          .select('id, course_id, title, summary, video_url, content_md, writing_task_prompt, task_type')
          .eq('id', params.lessonId)
          .single();

        if (error || !ls) { setDenied(true); setLoading(false); return; }
        setLesson(ls);

        const { data: prog } = await supabase
          .from('lesson_progress')
          .select('status')
          .eq('user_id', user.id)
          .eq('lesson_id', params.lessonId)
          .maybeSingle();

        if (prog) {
          setStatus(prog.status);
        } else {
          await supabase.from('lesson_progress').insert({ user_id: user.id, lesson_id: params.lessonId, status: 'started' });
          setStatus('started');
        }
      } catch (e) {
        console.error('lesson load error', e);
        setDenied(true);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lessonId]);

  async function markCompleted() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !lesson) return;
    await supabase
      .from('lesson_progress')
      .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('lesson_id', lesson.id);
    setStatus('completed');
  }

  if (loading) {
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center"><p className="text-navy-400 text-sm">Đang tải bài học...</p></div>;
  }

  if (denied || !lesson) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center px-6">
        <div className="bg-navy-800 border border-brand-500/30 rounded-xl p-10 text-center max-w-md">
          <p className="text-2xl mb-3">🔒</p>
          <p className="text-navy-200 font-medium">Bài học dành cho học viên Premium</p>
          <p className="text-sm text-navy-400 mt-1 mb-5">Nâng cấp để mở toàn bộ lộ trình học.</p>
          <Link href="/pricing" className="inline-block px-6 py-2.5 rounded-lg bg-brand-500 text-navy-900 font-semibold text-sm hover:bg-brand-400 transition">Xem gói Premium</Link>
        </div>
      </div>
    );
  }

  const evaluateHref = lesson.writing_task_prompt
    ? `/evaluate?prompt=${encodeURIComponent(lesson.writing_task_prompt)}&task=${lesson.task_type}&lesson=${lesson.id}`
    : '/evaluate';

  return (
    <div className="min-h-screen bg-navy-900">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link href={`/courses/${lesson.course_id}`} className="text-xs text-navy-400 hover:text-brand-400 transition">← Danh sách bài học</Link>
        <h1 className="font-['DM_Serif_Display'] text-2xl text-white mt-4 mb-1">{lesson.title}</h1>
        {lesson.summary && <p className="text-sm text-navy-400 mb-6">{lesson.summary}</p>}

        {lesson.video_url && (
          <div className="aspect-video rounded-xl overflow-hidden border border-navy-700 mb-8 bg-black">
            <iframe
              src={toEmbedUrl(lesson.video_url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {lesson.content_md && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <div className="text-sm text-navy-200 leading-relaxed whitespace-pre-wrap">{lesson.content_md}</div>
          </div>
        )}

        {lesson.writing_task_prompt && (
          <div className="bg-navy-800 border border-brand-500/40 rounded-xl p-6 mb-8">
            <p className="text-xs font-mono tracking-[0.25em] text-brand-400 uppercase mb-2">✍ Writing Task</p>
            <p className="text-sm text-navy-100 leading-relaxed mb-4">{lesson.writing_task_prompt}</p>
            <Link href={evaluateHref} className="inline-block px-5 py-2.5 rounded-lg bg-brand-500 text-navy-900 font-semibold text-sm hover:bg-brand-400 transition">Viết bài & chấm ngay →</Link>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-navy-500 font-mono">{status === 'completed' ? '✓ Đã hoàn thành' : 'Đang học'}</span>
          {status !== 'completed' && (
            <button onClick={markCompleted} className="px-5 py-2 rounded-lg border border-brand-500/50 text-brand-400 text-sm hover:bg-brand-500/10 transition">Đánh dấu hoàn thành</button>
          )}
        </div>
      </main>
    </div>
  );
}
