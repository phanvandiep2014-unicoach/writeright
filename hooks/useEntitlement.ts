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
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPlan('free'); setUsedThisWeek(0); setLoading(false); return; }

    const { data } = await supabase
      .from('user_entitlements')
      .select('plan, evals_this_week')
      .eq('user_id', user.id)
      .single();

    setPlan((data?.plan as Plan) ?? 'free');
    setUsedThisWeek(data?.evals_this_week ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isPaid = plan === 'standard' || plan === 'premium';
  const freeLeft = Math.max(0, FREE_EVALS_PER_WEEK - usedThisWeek);

  return {
    plan,
    isPaid,
    loading,
    freeLeft,
    /** Detailed criterion breakdown + corrections + rewrite are paid-only. */
    canSeeDetail: isPaid,
    /** Progress trajectory chart is paid-only (loss-aversion lever). */
    canSeeProgress: isPaid,
    refresh,
  };
}
