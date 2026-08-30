'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * useEntitlement — single source of truth for "what is this user allowed to see?"
 *
 * Free tier rule (the conversion lever):
 *   - Free users may run FREE_EVALS_PER_WEEK full evaluations per rolling week.
 *   - They ALWAYS see the overall band for free.
 *   - The 4-criteria breakdown, inline corrections, and rewrite loop are GATED.
 *
 * Reads from the `user_entitlements` view created in sql/conversion-features.sql.
 */
export type Plan = 'free' | 'standard' | 'premium';

const FREE_EVALS_PER_WEEK = 1;

export function useEntitlement() {
  const [plan, setPlan] = useState<Plan>('free');
  const [usedThisWeek, setUsedThisWeek] = useState(0);
  const [freeFullCredits, setFreeFullCredits] = useState(0);
  const [freeFullUntil, setFreeFullUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPlan('free'); setUsedThisWeek(0);
      setFreeFullCredits(0); setFreeFullUntil(null);
      setLoading(false); return;
    }

    const { data } = await supabase
      .from('user_entitlements')
      .select('plan, evals_this_week')
      .eq('user_id', user.id)
      .single();

    setPlan((data?.plan as Plan) ?? 'free');
    setUsedThisWeek(data?.evals_this_week ?? 0);

    // Lượt miễn phí do LMS cấp — đọc thẳng từ profiles để khỏi phải sửa view
    // user_entitlements (view đó chỉ sửa được bằng drop, hỏng một lần là cả
    // app mất quyền). Cột chỉ có sau khi chạy sql/lms-free-credit.sql; chưa
    // chạy thì select lỗi và mọi thứ chạy y như trước.
    const { data: prof } = await supabase
      .from('profiles')
      .select('free_full_credits, free_full_until')
      .eq('id', user.id)
      .maybeSingle();
    setFreeFullCredits(prof?.free_full_credits ?? 0);
    setFreeFullUntil(prof?.free_full_until ?? null);

    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isPaid = plan === 'standard' || plan === 'premium';
  const freeLeft = Math.max(0, FREE_EVALS_PER_WEEK - usedThisWeek);

  /**
   * Học viên mới từ UNICOACH LMS được xem đầy đủ: trước khi chấm vì còn lượt,
   * sau khi chấm vì đang trong hạn 30 ngày. Nếu chỉ xét lượt thì trang kết quả
   * sẽ khoá lại ngay khi tải lại — đúng lúc họ muốn đọc kỹ nhất.
   */
  const hasFreeFullAccess =
    freeFullCredits > 0 ||
    (!!freeFullUntil && new Date(freeFullUntil).getTime() > Date.now());

  return {
    plan,
    isPaid,
    loading,
    freeLeft,
    /** Còn lượt chấm đầy đủ miễn phí do LMS cấp (chưa tiêu). */
    freeFullCredits,
    /** Đang được xem đầy đủ dù chưa trả phí (lượt LMS hoặc hạn 30 ngày sau đó). */
    hasFreeFullAccess,
    /** Detailed criterion breakdown + corrections + rewrite are paid-only. */
    canSeeDetail: isPaid || hasFreeFullAccess,
    /** Progress trajectory chart is paid-only (loss-aversion lever). */
    canSeeProgress: isPaid || hasFreeFullAccess,
    refresh,
  };
}
