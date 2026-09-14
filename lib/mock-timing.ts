// Phân tích quản lý thời gian cho bài Thi thử Writing.
//
// Toàn bộ file này là HÀM THUẦN, không gọi AI, không chạm CSDL: đưa vào số
// liệu bấm giờ, trả ra nhận xét. Ba lý do:
//   1. Miễn phí và tức thì — học viên thấy nhận xét thời gian ngay cả khi
//      phần chấm AI lỗi.
//   2. Nhất quán — cùng một cách làm bài luôn ra cùng một nhận xét, khác với
//      LLM mỗi lần nói một kiểu.
//   3. Test được — xem `__tests__` hoặc chạy trực tiếp bằng tsx.
//
// Ranh giới trách nhiệm: file này KHÔNG chấm chất lượng bài viết. Nó chỉ đọc
// đồng hồ. Câu "bạn không rà lại bài" là sự thật về hành vi; câu "bài bạn
// nhiều lỗi ngữ pháp" là việc của phần chấm.

export interface TimingSample {
  /** Giây kể từ lúc bắt đầu phần thi này. */
  t: number;
  /** Số từ đếm được tại thời điểm đó. */
  words: number;
}

export interface TaskTiming {
  task: 1 | 2;
  /** Thời gian được cấp (giây): 1200 cho Task 1, 2400 cho Task 2. */
  allottedSec: number;
  /** Thời gian thực sự dùng tới lúc nộp. */
  usedSec: number;
  /** true khi hết giờ tự nộp, false khi học viên bấm nộp. */
  autoSubmitted: boolean;
  /** Giây tới phím đầu tiên — đây là thời gian lập dàn ý. */
  firstKeystrokeSec: number | null;
  /** Giây tới phím cuối cùng — khoảng còn lại tới lúc nộp là thời gian rà bài. */
  lastKeystrokeSec: number | null;
  wordCount: number;
  samples: TimingSample[];
  /** Số lần dán văn bản. Không chặn, chỉ ghi nhận để nhắc. */
  pasteCount: number;
}

export type Severity = 'good' | 'watch' | 'critical';
export type Criterion = 'TA' | 'CC' | 'LR' | 'GRA';

export interface TimingFinding {
  code: string;
  severity: Severity;
  task: 1 | 2 | 'both';
  title: string;
  detail: string;
  /** Tiêu chí bị ảnh hưởng — để nối nhận xét thời gian với điểm số. */
  criterion?: Criterion;
}

export interface TaskPace {
  task: 1 | 2;
  planningSec: number;
  writingSec: number;
  reviewSec: number;
  wordsPerMin: number;
  wordCount: number;
  minWords: number;
  targetWords: number;
  /** Số phút cần để đạt targetWords với tốc độ viết hiện tại. */
  minutesForTarget: number | null;
  /** Nhắc lại ở đây để giao diện vẽ được thanh thời gian mà không cần dữ liệu thô. */
  autoSubmitted: boolean;
}

export interface TimingAnalysis {
  paces: TaskPace[];
  findings: TimingFinding[];
  /** 0–100. Chỉ đo cách dùng thời gian, không phải chất lượng bài. */
  score: number;
  headline: string;
}

/** Chuẩn của một phần thi. Số phút lập dàn ý và rà bài lấy theo hướng dẫn
 *  luyện thi phổ biến, không phải quy định của IELTS — nên gọi là "khuyến nghị". */
const SPEC = {
  1: { minWords: 150, targetWords: 180, planMin: 90, planMax: 300, reviewMin: 120, allotted: 20 * 60 },
  2: { minWords: 250, targetWords: 280, planMin: 240, planMax: 540, reviewMin: 180, allotted: 40 * 60 },
} as const;

export const TASK_SPEC = SPEC;

function mins(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return s === 0 ? `${m} phút` : `${m} phút ${s} giây`;
}

/** Cửa sổ đứng hình dài nhất: khoảng ≥ `windowSec` mà số từ tăng dưới `minWords`. */
function longestStall(samples: TimingSample[], windowSec = 180, minWords = 15): { startSec: number; sec: number } | null {
  if (samples.length < 2) return null;
  let best: { startSec: number; sec: number } | null = null;
  for (let i = 0; i < samples.length; i++) {
    for (let j = samples.length - 1; j > i; j--) {
      const span = samples[j].t - samples[i].t;
      if (span < windowSec) break;
      if (samples[j].words - samples[i].words < minWords) {
        if (!best || span > best.sec) best = { startSec: samples[i].t, sec: span };
        break;
      }
    }
  }
  return best;
}

export function paceOf(t: TaskTiming): TaskPace {
  const spec = SPEC[t.task];
  const planningSec = Math.max(0, Math.min(t.firstKeystrokeSec ?? t.usedSec, t.usedSec));
  const lastKey = Math.max(planningSec, Math.min(t.lastKeystrokeSec ?? t.usedSec, t.usedSec));
  const writingSec = Math.max(0, lastKey - planningSec);
  const reviewSec = Math.max(0, t.usedSec - lastKey);
  const wordsPerMin = writingSec > 0 ? (t.wordCount / writingSec) * 60 : 0;
  return {
    task: t.task,
    planningSec, writingSec, reviewSec,
    wordsPerMin: Math.round(wordsPerMin * 10) / 10,
    wordCount: t.wordCount,
    minWords: spec.minWords,
    targetWords: spec.targetWords,
    minutesForTarget: wordsPerMin > 0 ? Math.round((spec.targetWords / wordsPerMin) * 10) / 10 : null,
    autoSubmitted: t.autoSubmitted,
  };
}

/**
 * Điểm tổng Writing = (Task 1 + 2 × Task 2) / 3, làm tròn theo quy tắc IELTS
 * (dư .25 lên nửa band, dư .75 lên band nguyên). Task 2 nặng gấp đôi — đây là
 * lý do mọi nhận xét bên dưới đều ưu tiên bảo vệ thời gian cho Task 2.
 */
export function weightedWritingBand(task1Band: number | null, task2Band: number | null): number | null {
  if (task1Band == null && task2Band == null) return null;
  if (task1Band == null) return task2Band;
  if (task2Band == null) return task1Band;
  return Math.round(((task1Band + 2 * task2Band) / 3) * 2) / 2;
}

/**
 * Đọc số liệu bấm giờ của một hoặc hai phần và trả về nhận xét.
 * `full` = true khi học viên làm cả hai phần liên tiếp — chỉ khi đó mới nói
 * được chuyện phân bổ thời gian GIỮA hai phần.
 */
export function analyseTiming(timings: TaskTiming[], full: boolean): TimingAnalysis {
  const paces = timings.map(paceOf);
  const findings: TimingFinding[] = [];
  const byTask = new Map(timings.map(t => [t.task, t]));

  for (const t of timings) {
    const spec = SPEC[t.task];
    const p = paces.find(x => x.task === t.task)!;
    const label = `Task ${t.task}`;

    // ── Thiếu chữ: đây là lỗi đắt nhất và là lỗi duy nhất bị phạt cứng ──
    if (t.wordCount < spec.minWords) {
      findings.push({
        code: 'UNDER_LENGTH', severity: 'critical', task: t.task, criterion: 'TA',
        title: `${label} chưa đủ số từ tối thiểu`,
        detail: `Bạn viết ${t.wordCount} từ, dưới mức ${spec.minWords} từ bắt buộc. Giám khảo áp trần Task Achievement ở 5.0 cho bài thiếu chữ, dù nội dung tốt đến đâu. Với tốc độ ${p.wordsPerMin} từ/phút của bạn hôm nay, bạn cần khoảng ${p.minutesForTarget ?? '—'} phút viết liên tục để chạm ${spec.targetWords} từ.`,
      });
    }

    // ── Hết giờ ──
    if (t.autoSubmitted && t.wordCount >= spec.minWords) {
      findings.push({
        code: 'AUTO_SUBMIT', severity: 'watch', task: t.task, criterion: 'GRA',
        title: `${label} bị hết giờ khi vẫn đang viết`,
        detail: `Bài được nộp tự động lúc hết ${mins(spec.allotted)}. Bạn đủ chữ, nhưng câu cuối và toàn bộ phần rà lỗi đã mất. Lỗi chính tả và chia thì còn sót là thứ hạ Grammatical Range nhanh nhất.`,
      });
    }

    // ── Lập dàn ý ──
    if (p.planningSec < spec.planMin) {
      findings.push({
        code: 'NO_PLANNING', severity: 'watch', task: t.task, criterion: t.task === 2 ? 'CC' : 'TA',
        title: `${label}: viết ngay, gần như không lập dàn ý`,
        detail: `Bạn gõ chữ đầu tiên sau ${mins(p.planningSec)}. Khuyến nghị ${mins(spec.planMin)}–${mins(spec.planMax)}. Bài viết không có dàn ý thường lộ ra ở đoạn thân thứ hai: ý trùng đoạn một, hoặc đổi lập trường giữa chừng — đúng hai thứ Coherence & Cohesion trừ điểm.`,
      });
    } else if (p.planningSec > spec.planMax) {
      findings.push({
        code: 'OVER_PLANNING', severity: 'watch', task: t.task, criterion: 'TA',
        title: `${label}: lập dàn ý quá lâu`,
        detail: `Bạn dành ${mins(p.planningSec)} trước khi viết chữ đầu, vượt khuyến nghị ${mins(spec.planMax)}. Phần còn lại chỉ ${mins(p.writingSec)} để viết ${spec.targetWords} từ. Dàn ý ở phòng thi nên là năm gạch đầu dòng, không phải một đoạn văn.`,
      });
    }

    // ── Rà bài ──
    if (p.reviewSec < spec.reviewMin && !t.autoSubmitted) {
      findings.push({
        code: 'NO_REVIEW', severity: 'watch', task: t.task, criterion: 'GRA',
        title: `${label}: nộp ngay sau chữ cuối cùng`,
        detail: `Chỉ ${mins(p.reviewSec)} giữa phím cuối và lúc nộp, khuyến nghị tối thiểu ${mins(spec.reviewMin)}. Hai phút đọc lại thường nhặt được 3–5 lỗi mạo từ, số ít số nhiều và chia thì — đủ để đổi nửa band Grammatical Range.`,
      });
    } else if (p.reviewSec >= spec.reviewMin) {
      findings.push({
        code: 'GOOD_REVIEW', severity: 'good', task: t.task,
        title: `${label}: có rà lại bài`,
        detail: `Bạn để dành ${mins(p.reviewSec)} cuối để đọc lại. Giữ thói quen này.`,
      });
    }

    // ── Đứng hình giữa bài ──
    const writingSamples = t.samples.filter(s => s.t >= p.planningSec && s.t <= p.planningSec + p.writingSec);
    const stall = longestStall(writingSamples);
    if (stall) {
      findings.push({
        code: 'STALL', severity: 'watch', task: t.task, criterion: 'TA',
        title: `${label}: đứng hình ${mins(stall.sec)} giữa bài`,
        detail: `Từ phút ${Math.floor(stall.startSec / 60)} tới phút ${Math.floor((stall.startSec + stall.sec) / 60)} bạn gần như không thêm chữ nào. Đây không phải vấn đề tốc độ gõ mà là bí ý. Cách chữa là ở khâu dàn ý: viết sẵn ví dụ cụ thể cho từng đoạn thân trước khi bắt đầu.`,
      });
    }

    // ── Xong sớm nhưng thiếu chữ ──
    if (!t.autoSubmitted && t.usedSec < spec.allotted * 0.7 && t.wordCount < spec.minWords) {
      findings.push({
        code: 'EARLY_SHORT', severity: 'critical', task: t.task, criterion: 'TA',
        title: `${label}: nộp sớm khi bài còn thiếu`,
        detail: `Bạn nộp sau ${mins(t.usedSec)} trong khi còn ${mins(spec.allotted - t.usedSec)} và bài mới ${t.wordCount}/${spec.minWords} từ. Thời gian không phải thứ đang thiếu — thứ đang thiếu là ý. Đừng nộp sớm: thêm một ví dụ cụ thể vào mỗi đoạn thân luôn tốt hơn một bài ngắn.`,
      });
    }

    if (t.pasteCount > 0) {
      findings.push({
        code: 'PASTE', severity: 'watch', task: t.task,
        title: `${label}: có thao tác dán văn bản`,
        detail: `Ghi nhận ${t.pasteCount} lần dán. Phòng thi CD-IELTS có nút copy/paste trong bài làm của bạn, nhưng dán nội dung từ ngoài vào sẽ làm kết quả thi thử không còn phản ánh đúng năng lực.`,
      });
    }
  }

  // ── Phân bổ giữa hai phần — chỉ nói được khi làm đủ cả hai ─────────────
  const t1 = byTask.get(1), t2 = byTask.get(2);
  if (full && t1 && t2) {
    const p1 = paces.find(x => x.task === 1)!;
    const p2 = paces.find(x => x.task === 2)!;
    const t1Heavy = t1.usedSec >= SPEC[1].allotted * 0.95;
    const t2Hurt = t2.autoSubmitted || t2.wordCount < SPEC[2].minWords;

    if (t1Heavy && t2Hurt) {
      findings.push({
        code: 'T1_OVERINVEST', severity: 'critical', task: 'both', criterion: 'TA',
        title: 'Dồn quá nhiều vào Task 1, Task 2 phải trả giá',
        detail: `Bạn dùng trọn ${mins(t1.usedSec)} cho Task 1 (${t1.wordCount} từ, vượt ${Math.max(0, t1.wordCount - SPEC[1].targetWords)} từ so với mức cần) rồi vào Task 2 với ${t2.wordCount} từ và ${t2.autoSubmitted ? 'hết giờ' : 'nộp non'}. Task 2 nặng gấp đôi Task 1 trong điểm tổng — mỗi phút tiêu quá ở Task 1 đắt gấp đôi khi lấy từ Task 2. Lần sau: chốt Task 1 ở phút thứ 18 dù còn muốn viết thêm.`,
      });
    }

    if (t1.wordCount > SPEC[1].targetWords + 60) {
      findings.push({
        code: 'T1_TOO_LONG', severity: 'watch', task: 1,
        title: 'Task 1 dài hơn mức cần thiết',
        detail: `${t1.wordCount} từ cho một bài yêu cầu 150. Viết dài không cộng điểm ở Task 1 mà chỉ mở thêm chỗ cho lỗi, và ăn mất thời gian của Task 2. Khoảng ${SPEC[1].targetWords} từ là đủ.`,
      });
    }

    const rateGap = p1.wordsPerMin > 0 && p2.wordsPerMin > 0 ? p2.wordsPerMin / p1.wordsPerMin : 1;
    if (rateGap < 0.65) {
      findings.push({
        code: 'T2_SLOWER', severity: 'watch', task: 2, criterion: 'CC',
        title: 'Tốc độ tụt hẳn ở Task 2',
        detail: `Task 1 bạn viết ${p1.wordsPerMin} từ/phút, Task 2 chỉ còn ${p2.wordsPerMin} từ/phút. Sau 20 phút đầu, phần lớn học viên tụt vì phải vừa nghĩ ý vừa viết. Luyện riêng khâu tìm ý: cho mình 5 phút gạch ý cho một đề Task 2 mỗi ngày, không viết bài.`,
      });
    }
  }

  // ── Chấm điểm cách dùng thời gian ─────────────────────────────────────
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'critical') score -= 25;
    else if (f.severity === 'watch') score -= 10;
  }
  score = Math.max(0, Math.min(100, score));

  const criticals = findings.filter(f => f.severity === 'critical');
  const watches = findings.filter(f => f.severity === 'watch');
  const headline = criticals.length > 0
    ? criticals[0].title
    : watches.length > 0
      ? `Thời gian dùng được, còn ${watches.length} chỗ tinh chỉnh`
      : 'Quản lý thời gian tốt — giữ nguyên cách làm này';

  return { paces, findings, score, headline };
}

/**
 * Rút gọn phần thời gian thành vài dòng chữ để đưa vào prompt tổng hợp.
 * Chỉ đưa SỰ THẬT đã tính sẵn — mô hình không được tự suy ra con số nào.
 */
export function timingBrief(a: TimingAnalysis): string {
  const lines = a.paces.map(p =>
    `Task ${p.task}: ${p.wordCount} words (minimum ${p.minWords}), planning ${Math.round(p.planningSec / 60)}m, writing ${Math.round(p.writingSec / 60)}m, review ${Math.round(p.reviewSec / 60)}m, pace ${p.wordsPerMin} w/min.`
  );
  for (const f of a.findings) {
    if (f.severity !== 'good') lines.push(`[${f.severity}] ${f.code} — ${f.title}`);
  }
  return lines.join('\n');
}
