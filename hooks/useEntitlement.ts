'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { FREE_PER_30D, WELCOME_CREDITS, countFreeUsage, freeState } from '@/lib/free-plan';

/**
 * useEntitlement — single source of truth for "what is this user allowed to see?"
 *
 * Gói miễn phí (lib/free-plan.ts, từ 28/11/2026):
 *   - Gói chào mừng: WELCOME_CREDITS lượt chấm ĐẦY ĐỦ trong WELCOME_DAYS ngày đầu kể từ khi tạo tài khoản.
 *     Trong cửa sổ đó học viên xem được toàn bộ phân tích chi tiết.
 *   - Sau đó: FREE_PER_30D lượt / 30 ngày gần nhất, chỉ band tổng + nhận xét ngắn;
 *     4 tiêu chí, lỗi sai inline và vòng viết lại bị khoá (<DetailGate>).
 */
export type Plan = 'free' | 'standard' | 'premium';

export function useEntitlement() {
  const [plan, setPlan] = useState<Plan>('free');
  const [freeLeft, setFreeLeft] = useState(0);
  const [welcomeLeft, setWelcomeLeft] = useState(0);
  const [welcomeEndsAt, setWelcomeEndsAt] = useState<string | null>(null);
  const [welcomeWindowOpen, setWelcomeWindowOpen] = useState(false);
  const [freeFullCredits, setFreeFullCredits] = useState(0);
  const [freeFullUntil, setFreeFullUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPlan('free'); setFreeLeft(0); setWelcomeLeft(0); setWelcomeEndsAt(null); setWelcomeWindowOpen(false);
      setFreeFullCredits(0); setFreeFullUntil(null);
      setLoading(false); return;
    }

    const { data } = await supabase
      .from('user_entitlements')
      .select('plan')
      .eq('user_id', user.id)
      .single();
    const p = (data?.plan as Plan) ?? 'free';
    setPlan(p);

    // Lượt miễn phí do LMS cấp — đọc thẳng từ profiles để khỏi phải sửa view
    // user_entitlements (view đó chỉ sửa được bằng drop). Cột chưa có thì select lỗi
    // và mọi thứ chạy như trước.
    const { data: prof } = await supabase
      .from('profiles')
      .select('free_full_credits, free_full_until')
      .eq('id', user.id)
      .maybeSingle();
    setFreeFullCredits(prof?.free_full_credits ?? 0);
    setFreeFullUntil(prof?.free_full_until ?? null);

    if (p === 'free') {
      // created_at đọc riêng: select gộp với cột chưa tồn tại sẽ làm hỏng cả câu.
      const { data: pc } = await supabase.from('profiles').select('created_at').eq('id', user.id).maybeSingle();
      const createdAt = (pc as any)?.created_at ?? user.created_at ?? null;
      const usage = await countFreeUsage(supabase, user.id, createdAt);
      const st = freeState(createdAt, usage.inWindow, usage.afterWindow);
      setFreeLeft(st.left);
      setWelcomeLeft(st.welcomeLeft);
      setWelcomeEndsAt(st.welcomeEndsAt);
      setWelcomeWindowOpen(st.welcomeWindowOpen);
    } else {
      setFreeLeft(0); setWelcomeLeft(0); setWelcomeEndsAt(null); setWelcomeWindowOpen(false);
    }

    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isPaid = plan === 'standard' || plan === 'premium';

  /**
   * Học viên mới từ UNICOACH LMS được xem đầy đủ: trước khi chấm vì còn lượt,
   * sau khi chấm vì đang trong hạn 30 ngày.
   */
  const hasLmsFullAccess =
    freeFullCredits > 0 ||
    (!!freeFullUntil && new Date(freeFullUntil).getTime() > Date.now());
  /** Gói chào mừng: mở chi tiết suốt cửa sổ 14 ngày, kể cả sau khi đã dùng hết lượt. */
  const hasWelcomeAccess = !isPaid && welcomeWindowOpen;
  const hasFreeFullAccess = hasLmsFullAccess || hasWelcomeAccess;

  return {
    plan,
    isPaid,
    loading,
    /** Lượt miễn phí còn chấm được ngay (gói chào mừng nếu còn, không thì hạn mức 30 ngày). */
    freeLeft,
    /** Gói chào mừng: số lượt đầy đủ còn lại và ngày hết hạn. */
    welcomeLeft,
    welcomeEndsAt,
    welcomeWindowOpen,
    welcomeCredits: WELCOME_CREDITS,
    freePer30d: FREE_PER_30D,
    /** Còn lượt chấm đầy đủ miễn phí do LMS cấp (chưa tiêu). */
    freeFullCredits,
    /** Đang được xem đầy đủ dù chưa trả phí (lượt LMS, hạn 30 ngày sau đó, hoặc gói chào mừng). */
    hasFreeFullAccess,
    /** Detailed criterion breakdown + corrections + rewrite are paid-only. */
    canSeeDetail: isPaid || hasFreeFullAccess,
    /** Progress trajectory chart is paid-only (loss-aversion lever). */
    canSeeProgress: isPaid || hasFreeFullAccess,
    refresh,
  };
}
