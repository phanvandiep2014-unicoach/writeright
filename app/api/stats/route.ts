import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';

/**
 * /api/stats — số liệu THẬT cho trang chủ.
 *
 * Quy tắc trung thực (chốt với Phan 06/08/2026):
 *   • Không bịa số. Mọi con số ở đây đến thẳng từ bảng `evaluations`.
 *   • Chỉ số nào chưa đủ mẫu để có ý nghĩa thì KHÔNG trả ra, và trang chủ
 *     lặng lẽ ẩn khối đó — thà thiếu còn hơn khoe một con số yếu.
 *   • Không bao giờ trả user_id, email hay nội dung bài viết.
 *
 * Ngưỡng có thể chỉnh bằng biến môi trường mà không cần sửa mã, ví dụ
 * STATS_MIN_ESSAYS_COUNT=150.
 */

export const runtime = 'nodejs';
export const revalidate = 900; // 15 phút

const num = (key: string, fallback: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

// Ngưỡng hiển thị — dưới ngưỡng thì ẩn hẳn chỉ số đó.
const T = {
  essaysCount: num('STATS_MIN_ESSAYS_COUNT', 250),    // "đã chấm N bài"
  learnersCount: num('STATS_MIN_LEARNERS_COUNT', 80), // "N người học"
  weekly: num('STATS_MIN_WEEKLY', 120),               // đồ thị lượt dùng theo tuần
  errors: num('STATS_MIN_ERRORS', 60),                // top lỗi thường gặp
  criteria: num('STATS_MIN_CRITERIA', 40),            // điểm TB 4 tiêu chí
  volume: num('STATS_MIN_VOLUME', 25),                // tổng chữ + tổng lỗi đã chỉ ra
  progressUsers: num('STATS_MIN_PROGRESS_USERS', 20), // đường cong tiến bộ
  stageProgress: num('STATS_MIN_STAGE_PROGRESS', 3),  // thời gian nâng band/giai đoạn — mỗi mốc cần ít nhất N người đã vượt qua (SQL đã lọc >=3, đây chỉ chặn thêm nếu Phan muốn ngưỡng cao hơn)
};

type Raw = {
  generated_at: string;
  essays_total: number;
  essays_30d: number;
  learners_total: number;
  learners_30d: number;
  words_total: number;
  last_eval_at: string | null;
  corrections_total: number;
  top_errors: { category: string; n: number }[];
  weekly: { week_start: string; essays: number; learners: number }[];
  progress_curve: { nth: number; avg_band: number; n: number }[];
  improvement: { n_users?: number; avg_delta?: number; median_delta?: number; pct_improved?: number };
  criteria: {
    task_achievement?: number; coherence_cohesion?: number;
    lexical_resource?: number; grammatical_range?: number; n?: number;
  };
  band_distribution: { bucket: string; n: number }[];
  stage_progress: { fromStage: number; avgDays: number; medianDays: number; n: number }[];
};

let cache: { at: number; body: unknown } | null = null;
const TTL_MS = 15 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return json(cache.body);

  let raw: Raw;
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.rpc('wr_public_stats');
    if (error) throw error;
    raw = data as Raw;
  } catch (err) {
    // Không đánh sập trang chủ vì thống kê. Trả rỗng, trang chủ tự ẩn khối.
    console.error('[api/stats]', err);
    return json({ ok: false, metrics: {} }, 200);
  }

  const essays = raw?.essays_total ?? 0;
  const metrics: Record<string, unknown> = {};

  // ── Con số tổng: chỉ hiện khi đã đủ lớn để nói lên điều gì đó ──
  if (essays >= T.essaysCount) {
    metrics.essaysTotal = essays;
    metrics.essays30d = raw.essays_30d;
  }
  if ((raw?.learners_total ?? 0) >= T.learnersCount) {
    metrics.learnersTotal = raw.learners_total;
    metrics.learners30d = raw.learners_30d;
  }

  // ── Khối lượng công việc đã làm: đúng ngay cả khi mới bắt đầu ──
  // Mỗi bài sinh 6–14 chỗ sửa nên hai số này lớn hơn số bài một bậc.
  if (essays >= T.volume) {
    metrics.correctionsTotal = raw.corrections_total;
    metrics.wordsTotal = raw.words_total;
  }

  // ── Đồ thị lượt dùng theo tuần ──
  if (essays >= T.weekly && Array.isArray(raw.weekly)) {
    metrics.weekly = raw.weekly;
  }

  // ── Lỗi thường gặp nhất ──
  if (essays >= T.errors && Array.isArray(raw.top_errors) && raw.top_errors.length) {
    const total = raw.top_errors.reduce((s, e) => s + e.n, 0) || 1;
    metrics.topErrors = raw.top_errors.map((e) => ({
      category: e.category,
      n: e.n,
      pct: Math.round((e.n / total) * 1000) / 10,
    }));
  }

  // ── Điểm trung bình 4 tiêu chí ──
  if (essays >= T.criteria && raw.criteria?.n) {
    metrics.criteria = {
      taskAchievement: raw.criteria.task_achievement,
      coherenceCohesion: raw.criteria.coherence_cohesion,
      lexicalResource: raw.criteria.lexical_resource,
      grammaticalRange: raw.criteria.grammatical_range,
      n: raw.criteria.n,
    };
  }

  // ── Đường cong tiến bộ ──
  const impUsers = raw.improvement?.n_users ?? 0;
  if (impUsers >= T.progressUsers) {
    if (Array.isArray(raw.progress_curve) && raw.progress_curve.length >= 3) {
      metrics.progressCurve = raw.progress_curve;
    }
    metrics.improvement = {
      users: impUsers,
      avgDelta: raw.improvement.avg_delta,
      medianDelta: raw.improvement.median_delta,
      pctImproved: raw.improvement.pct_improved,
    };
  }

  // ── Phân bố band ──
  if (essays >= T.weekly && Array.isArray(raw.band_distribution)) {
    metrics.bandDistribution = raw.band_distribution;
  }

  // ── Thời gian nâng band trung bình, theo từng giai đoạn ──
  // SQL đã tự lọc mốc nào có dưới 3 người vượt qua (HAVING count(*) >= 3);
  // ở đây chỉ áp thêm ngưỡng nếu Phan muốn siết chặt hơn qua env.
  if (Array.isArray(raw.stage_progress)) {
    const rows = raw.stage_progress.filter((s) => s.n >= T.stageProgress);
    if (rows.length > 0) {
      metrics.stageProgress = rows.map((s) => ({
        fromStage: s.fromStage,
        avgDays: s.avgDays,
        medianDays: s.medianDays,
        n: s.n,
      }));
    }
  }

  const body = {
    ok: true,
    generatedAt: raw.generated_at,
    lastEvalAt: raw.last_eval_at,
    metrics,
  };

  cache = { at: Date.now(), body };
  return json(body);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}
