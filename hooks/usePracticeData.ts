'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { EvalRow, ExerciseRow } from '@/lib/practice-insights';
import type { Goal } from '@/lib/goal';

export interface PracticeEvalRow extends EvalRow {
  task_prompt: string | null;
  task_type: number | null;
}

export interface PracticeData {
  status: 'loading' | 'anon' | 'ready';
  /** Toàn bộ bài chấm gần đây (nhẹ, không kèm feedback), mới → cũ. */
  evals: PracticeEvalRow[];
  /** 10 bài gần nhất kèm danh sách lỗi — đầu vào cho hồ sơ lỗi và gợi ý hôm nay. */
  recent: PracticeEvalRow[];
  /** Kết quả bài tập kỹ năng; rỗng nếu chưa chạy sql/practice.sql. */
  exercises: ExerciseRow[];
  /** Mục tiêu band + ngày thi (bảng user_goals); null nếu chưa đặt hoặc không đọc được. */
  goal: Goal | null;
}

const LIGHT_COLS = 'task_prompt, task_type, overall_band, ta_band, cc_band, lr_band, gra_band, created_at';

/**
 * Một nơi duy nhất đọc dữ liệu luyện tập của học viên (RLS tự giới hạn theo user).
 * Hai truy vấn bài chấm: nhẹ và nhiều dòng để nhận diện đề đã làm / chuỗi ngày / xu hướng,
 * và nặng hơn nhưng chỉ 10 dòng để lấy danh sách lỗi (feedback->error_corrections).
 * Mọi truy vấn phụ hỏng (bảng chưa có, đường dẫn JSON không được hỗ trợ) đều rơi về
 * dữ liệu rỗng thay vì làm hỏng cả trang.
 */
export function usePracticeData(): PracticeData {
  const [data, setData] = useState<PracticeData>({ status: 'loading', evals: [], recent: [], exercises: [], goal: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) { setData({ status: 'anon', evals: [], recent: [], exercises: [], goal: null }); return; }

        const evalsQ = supabase.from('evaluations').select(LIGHT_COLS)
          .order('created_at', { ascending: false }).limit(500);

        const recentQ = (async () => {
          const withErrs = await supabase.from('evaluations')
            .select(`${LIGHT_COLS}, error_corrections:feedback->error_corrections`)
            .order('created_at', { ascending: false }).limit(10);
          if (!withErrs.error) return withErrs.data ?? [];
          const plain = await supabase.from('evaluations').select(LIGHT_COLS)
            .order('created_at', { ascending: false }).limit(10);
          return plain.data ?? [];
        })();

        const exQ = supabase.from('exercise_results').select('created_at, kind, criterion, correct')
          .order('created_at', { ascending: false }).limit(1000);

        const goalQ = supabase.from('user_goals').select('target_band, exam_date')
          .eq('user_id', user.id).maybeSingle();

        const [evals, recent, ex, g] = await Promise.all([evalsQ, recentQ, exQ, goalQ]);
        if (cancelled) return;
        setData({
          status: 'ready',
          evals: (evals.data ?? []) as PracticeEvalRow[],
          recent: recent as PracticeEvalRow[],
          exercises: ex.error ? [] : ((ex.data ?? []) as ExerciseRow[]),
          goal: g.error || !g.data ? null : { target_band: Number(g.data.target_band), exam_date: g.data.exam_date ?? null },
        });
      } catch {
        if (!cancelled) setData({ status: 'anon', evals: [], recent: [], exercises: [], goal: null });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return data;
}
