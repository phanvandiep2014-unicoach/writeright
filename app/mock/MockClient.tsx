'use client';
/**
 * Thi thử Writing trên máy — Task 1 và Task 2 liền mạch như phòng thi CD-IELTS,
 * chấm cả hai phần rồi trả về MỘT báo cáo chung.
 *
 * Ba thứ trang này làm mà trang chấm bài lẻ không làm được:
 *   • Đề ghép sẵn — học viên không phải tự chọn, và giáo viên giao được theo mã đề.
 *   • Bấm giờ có ghi vết — biết học viên dừng ở đâu, lập dàn ý bao lâu, có rà bài không.
 *   • Điểm tổng có trọng số — (Task 1 + 2 × Task 2) ÷ 3, đúng cách IELTS cộng điểm.
 *
 * File này là phần CLIENT. `page.tsx` (server component) đọc cookie
 * `uc_mock_session`/`uc_minutes` do `/sso` đặt khi đây là chặng Writing của
 * bài thi thử 4 kỹ năng, rồi truyền `examMinutes` xuống — cookie httpOnly nên
 * phải đọc ở server, component client không thấy được (và học viên cũng vậy).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { TASK1_BANK, TASK2_BANK, Task1Item, Task2Item, pickRandom, task1ToText } from '@/lib/writing-tasks';
import { TEST_PAPERS, TestPaper, LEVEL_LABEL, LEVEL_HINT, resolvePaper, nextPaper } from '@/lib/writing-papers';
import { analyseTiming, weightedWritingBand, TaskTiming, TimingSample } from '@/lib/mock-timing';
import { useEntitlement } from '@/hooks/useEntitlement';
import TaskVisual from '@/components/mock/TaskChart';
import MockReport, { MockResult, TaskScore } from '@/components/mock/MockReport';

type Mode = 'full' | 'task1' | 'task2';
type Stage = 'task1' | 'task2';
type Phase = 'select' | 'running' | 'grading' | 'result';

type Graded =
  | { ok: true; evalId: string | null; band: number | null; ta: number | null; cc: number | null; lr: number | null; gra: number | null; wordCount: number }
  | { ok: false; reason: string };

const TASK1_SECONDS = 20 * 60;
const TASK2_SECONDS = 40 * 60;
const MIN_WORDS_TO_GRADE = 20;
const SAMPLE_EVERY_SEC = 20;
const LS_SEEN1 = 'wr_mock_seen_task1';
const LS_SEEN2 = 'wr_mock_seen_task2';
const SEEN_CAP1 = 14;
const SEEN_CAP2 = 18;

function loadSeen(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function pushSeen(key: string, id: string, cap: number) {
  try {
    const cur = loadSeen(key).filter(x => x !== id);
    cur.push(id);
    while (cur.length > cap) cur.shift();
    localStorage.setItem(key, JSON.stringify(cur));
  } catch {}
}
function formatTime(sec: number) {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function wordCountOf(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

/** Vết bấm giờ của MỘT phần thi, gom trong lúc học viên đang viết. */
type Trace = {
  startedAt: number;
  firstKeystrokeSec: number | null;
  lastKeystrokeSec: number | null;
  samples: TimingSample[];
  pasteCount: number;
  autoSubmitted: boolean;
  usedSec: number;
  wordCount: number;
};
const newTrace = (): Trace => ({
  startedAt: Date.now(), firstKeystrokeSec: null, lastKeystrokeSec: null,
  samples: [], pasteCount: 0, autoSubmitted: false, usedSec: 0, wordCount: 0,
});

function traceToTiming(task: 1 | 2, tr: Trace, allottedSec: number): TaskTiming {
  return {
    task,
    allottedSec,
    usedSec: tr.usedSec,
    autoSubmitted: tr.autoSubmitted,
    firstKeystrokeSec: tr.firstKeystrokeSec,
    lastKeystrokeSec: tr.lastKeystrokeSec,
    wordCount: tr.wordCount,
    samples: tr.samples,
    pasteCount: tr.pasteCount,
  };
}

export default function MockClient({ examMinutes }: { examMinutes: number | null }) {
  const supabase = createClient();
  const isExam = examMinutes != null;
  // Chia đúng tỷ lệ 1:2 như IELTS thật (20:40 khi minutes=60 — trùng số hiện
  // tại). Task 2 lấy phần dư để tổng luôn khớp examMinutes tuyệt đối.
  const examT1Sec = isExam ? Math.round((examMinutes as number) * 60 / 3) : TASK1_SECONDS;
  const examT2Sec = isExam ? (examMinutes as number) * 60 - examT1Sec : TASK2_SECONDS;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [mode, setMode] = useState<Mode>('full');
  const [stage, setStage] = useState<Stage>('task1');
  const [paper, setPaper] = useState<TestPaper | null>(null);
  const [donePapers, setDonePapers] = useState<string[]>([]);
  const [showAllPapers, setShowAllPapers] = useState(false);
  const [task1, setTask1] = useState<Task1Item | null>(null);
  const [task2, setTask2] = useState<Task2Item | null>(null);
  const [essay1, setEssay1] = useState('');
  const [essay2, setEssay2] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [gradingLabel, setGradingLabel] = useState('');
  const [result, setResult] = useState<MockResult | null>(null);

  const essayRef = useRef<Record<Stage, string>>({ task1: '', task2: '' });
  const traceRef = useRef<Record<Stage, Trace>>({ task1: newTrace(), task2: newTrace() });
  const task1GradePromise = useRef<Promise<Graded> | null>(null);
  const examStartedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setAuthed(!!data.user);
      if (!data.user) return;
      // Đề đã làm — dùng để gợi ý đề kế tiếp. Bảng chỉ có sau khi chạy
      // sql/mock-tests.sql; chưa chạy thì lỗi bị nuốt và mọi thứ vẫn chạy.
      const { data: rows } = await supabase
        .from('mock_tests').select('paper_id').eq('user_id', data.user.id).not('paper_id', 'is', null);
      if (rows) setDonePapers(rows.map((r: any) => r.paper_id).filter(Boolean));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng hồ + lấy mẫu số từ. Một interval lo cả hai để hai việc không lệch nhau.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      setTimeLeft(s => s - 1);
      const tr = traceRef.current[stage];
      const elapsed = Math.round((Date.now() - tr.startedAt) / 1000);
      const lastT = tr.samples.length ? tr.samples[tr.samples.length - 1].t : -SAMPLE_EVERY_SEC;
      if (elapsed - lastT >= SAMPLE_EVERY_SEC) {
        tr.samples.push({ t: elapsed, words: wordCountOf(essayRef.current[stage]) });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, stage]);

  const currentEssay = stage === 'task1' ? essay1 : essay2;
  const currentTaskType = stage === 'task1' ? 1 : 2;
  const wc = wordCountOf(currentEssay);
  const minWords = stage === 'task1' ? 150 : 250;

  const onType = (v: string) => {
    const tr = traceRef.current[stage];
    const sec = Math.round((Date.now() - tr.startedAt) / 1000);
    if (tr.firstKeystrokeSec == null) tr.firstKeystrokeSec = sec;
    tr.lastKeystrokeSec = sec;
    essayRef.current[stage] = v;
    if (stage === 'task1') setEssay1(v); else setEssay2(v);
  };

  const beginStage = (st: Stage) => {
    traceRef.current[st] = newTrace();
    setStage(st);
    setTimeLeft(st === 'task1' ? examT1Sec : examT2Sec);
  };

  const startTest = (m: Mode, p: TestPaper | null) => {
    setMode(m); setPaper(p); setResult(null);
    setEssay1(''); setEssay2('');
    essayRef.current = { task1: '', task2: '' };
    task1GradePromise.current = null;

    if (p) {
      const { task1: t1, task2: t2 } = resolvePaper(p);
      setTask1(t1); setTask2(t2);
    } else {
      const seen1 = loadSeen(LS_SEEN1), seen2 = loadSeen(LS_SEEN2);
      if (m !== 'task2') { const t = pickRandom(TASK1_BANK, seen1); setTask1(t); pushSeen(LS_SEEN1, t.id, SEEN_CAP1); }
      else setTask1(null);
      if (m !== 'task1') { const t = pickRandom(TASK2_BANK, seen2); setTask2(t); pushSeen(LS_SEEN2, t.id, SEEN_CAP2); }
      else setTask2(null);
    }
    beginStage(m === 'task2' ? 'task2' : 'task1');
    setPhase('running');
  };

  // Chặng thi thử do LMS mở: bỏ qua toàn bộ màn chọn đề, tự vào bài ngay khi
  // xác nhận đã đăng nhập. Đề vẫn lấy theo cùng logic "gợi ý kế tiếp" — không
  // random tuỳ tiện, nhưng cũng không cho học viên tự chọn độ khó.
  useEffect(() => {
    if (!isExam || authed !== true || examStartedRef.current) return;
    examStartedRef.current = true;
    startTest('full', nextPaper(donePapers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExam, authed]);

  const gradeTask = useCallback(async (taskType: 1 | 2, taskPrompt: string, essayText: string): Promise<Graded> => {
    const words = wordCountOf(essayText);
    if (words < MIN_WORDS_TO_GRADE) return { ok: false, reason: `Bài quá ngắn (dưới ${MIN_WORDS_TO_GRADE} từ) nên chưa chấm được.` };
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType, taskPrompt, essayText }),
      });
      const data = await res.json();
      if (!res.ok) return {
        ok: false,
        reason: data.code === 'AUTH_REQUIRED' ? 'Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.' : (data.error || 'Có lỗi khi chấm bài.'),
      };
      return {
        ok: true, evalId: data.id ?? null, band: data.overall_band ?? null,
        ta: data.task_achievement?.band ?? null, cc: data.coherence_cohesion?.band ?? null,
        lr: data.lexical_resource?.band ?? null, gra: data.grammatical_range?.band ?? null,
        wordCount: words,
      };
    } catch {
      return { ok: false, reason: 'Không kết nối được máy chủ chấm bài.' };
    }
  }, []);

  const sealTrace = (st: Stage, auto: boolean) => {
    const tr = traceRef.current[st];
    tr.usedSec = Math.round((Date.now() - tr.startedAt) / 1000);
    tr.autoSubmitted = auto;
    tr.wordCount = wordCountOf(essayRef.current[st]);
    tr.samples.push({ t: tr.usedSec, words: tr.wordCount });
  };

  const toScore = (g: Graded | null, title: string): TaskScore | null => {
    if (!g || !g.ok) return null;
    return { band: g.band, ta: g.ta, cc: g.cc, lr: g.lr, gra: g.gra, wordCount: g.wordCount, evalId: g.evalId, title };
  };

  /**
   * Ghép kết quả hai phần. Ưu tiên báo cáo từ server; server hỏng thì vẫn dựng
   * được điểm tổng và toàn bộ phần thời gian ngay tại máy học viên — họ vừa
   * ngồi 60 phút, không được để màn hình trắng.
   *
   * Khi isExam: server tự đọc cookie uc_mock_session (httpOnly) để quyết định
   * có đẩy band về LMS hay không — trang này không cần và không nên biết giá
   * trị mock_session, chỉ cần đọc lại `examSync` trong phản hồi để báo học viên.
   */
  const finishTest = useCallback(async (g1: Graded | null, g2: Graded | null) => {
    const timings: TaskTiming[] = [];
    if (mode !== 'task2') timings.push(traceToTiming(1, traceRef.current.task1, examT1Sec));
    if (mode !== 'task1') timings.push(traceToTiming(2, traceRef.current.task2, examT2Sec));

    const s1 = toScore(g1, task1 ? `Task 1 — ${task1.title}` : 'Task 1');
    const s2 = toScore(g2, 'Task 2');
    const paperLabel = paper ? `Đề ${String(paper.no).padStart(2, '0')}` : null;

    const failures = [
      g1 && !g1.ok ? `Task 1: ${g1.reason}` : null,
      g2 && !g2.ok ? `Task 2: ${g2.reason}` : null,
    ].filter(Boolean).join(' · ');

    let built: MockResult;
    try {
      const res = await fetch('/api/mock-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, paperId: paper?.id ?? null,
          task1EvalId: g1 && g1.ok ? g1.evalId : null,
          task2EvalId: g2 && g2.ok ? g2.evalId : null,
          timings,
        }),
      });
      if (!res.ok) throw new Error('report failed');
      const d = await res.json();
      built = {
        id: d.id ?? null, mode, paperLabel,
        overallBand: d.overallBand ?? null,
        task1: s1, task2: s2,
        timing: d.timing, report: d.report ?? null,
        reportError: [d.reportError, failures].filter(Boolean).join(' · ') || null,
        examSync: isExam ? (d.examSync ?? { ok: false, error: 'Máy chủ không trả về trạng thái đồng bộ.' }) : undefined,
      };
    } catch {
      built = {
        id: null, mode, paperLabel,
        overallBand: mode === 'full'
          ? weightedWritingBand(s1?.band ?? null, s2?.band ?? null)
          : (s1?.band ?? s2?.band ?? null),
        task1: s1, task2: s2,
        timing: analyseTiming(timings, mode === 'full'),
        report: null,
        reportError: ['Chưa tạo được phần tổng hợp hai bài — điểm và phần thời gian bên dưới vẫn đầy đủ.', failures].filter(Boolean).join(' · '),
        examSync: isExam ? { ok: false, error: 'Không kết nối được máy chủ.' } : undefined,
      };
    }
    setResult(built);
    setPhase('result');
    if (paper) setDonePapers(prev => prev.includes(paper.id) ? prev : [...prev, paper.id]);
  }, [mode, paper, task1, isExam, examT1Sec, examT2Sec]);

  const handleSubmitStage = useCallback(async (auto: boolean) => {
    if (phase !== 'running') return;

    if (stage === 'task1') {
      sealTrace('task1', auto);
      const promptText = task1 ? task1ToText(task1) : '';
      if (mode === 'full') {
        // Chấm Task 1 ở nền trong lúc học viên làm Task 2 — tới lúc nộp Task 2
        // thì Task 1 thường đã xong, kết quả hiện gần như tức thì.
        task1GradePromise.current = gradeTask(1, promptText, essayRef.current.task1);
        beginStage('task2');
      } else {
        setPhase('grading');
        setGradingLabel('Đang chấm Task 1…');
        const g = await gradeTask(1, promptText, essayRef.current.task1);
        await finishTest(g, null);
      }
      return;
    }

    sealTrace('task2', auto);
    setPhase('grading');
    setGradingLabel(mode === 'full' ? 'Đang chấm Task 1 & Task 2, rồi dựng báo cáo chung…' : 'Đang chấm Task 2…');
    const g2 = await gradeTask(2, task2?.prompt ?? '', essayRef.current.task2);
    const g1 = task1GradePromise.current ? await task1GradePromise.current : null;
    setGradingLabel('Đang dựng báo cáo chung…');
    await finishTest(g1, g2);
  }, [phase, stage, mode, task1, task2, gradeTask, finishTest]);

  useEffect(() => {
    if (phase === 'running' && timeLeft <= 0) void handleSubmitStage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  const resetToSelect = () => {
    if (isExam) return; // không cho làm lại — đây là bài thi chính thức
    setPhase('select'); setPaper(null); setTask1(null); setTask2(null);
    setEssay1(''); setEssay2(''); setResult(null);
    essayRef.current = { task1: '', task2: '' };
    task1GradePromise.current = null;
  };

  const timerColor = timeLeft <= 120 ? 'text-red-400' : timeLeft <= 300 ? 'text-amber-400' : 'text-brand-400';
  const suggested = nextPaper(donePapers);

  return (
    <div className="min-h-screen">
      <header className="app-header">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="app-logo-wordmark">Write<span className="gold-foil">Right</span></span>
          </Link>
          <span style={{ flex: 1 }} />
          {!isExam && <Link href="/evaluate" className="app-nav-link">Chấm bài</Link>}
          {!isExam && <Link href="/dashboard" className="app-nav-link">Dashboard</Link>}
          {isExam && <span className="text-xs font-mono uppercase tracking-widest text-brand-400">Thi thử UNICOACH LMS</span>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {phase === 'select' && isExam && (
          <div className="animate-fade-up max-w-lg mx-auto text-center py-16">
            <div className="w-14 h-14 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-3xl mx-auto mb-5 animate-pulse">✦</div>
            <h1 className="text-xl text-white font-semibold mb-2">Đang chuẩn bị đề Writing…</h1>
            <p className="text-sm text-navy-400">
              {authed === false ? 'Đang xác thực phiên đăng nhập từ LMS…' : `Đồng hồ ${examMinutes} phút sẽ bắt đầu ngay.`}
            </p>
          </div>
        )}

        {phase === 'select' && !isExam && (
          <div className="animate-fade-up max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-sm font-mono tracking-widest uppercase text-brand-400 mb-3">Thi thử Writing</div>
              <h1 className="text-3xl text-white font-semibold">Trọn bài 60 phút, chấm cả hai phần</h1>
              <p className="text-sm text-navy-400 mt-2 leading-relaxed">
                {TEST_PAPERS.length} đề ghép sẵn Task 1 + Task 2 · tính giờ 20&nbsp;+&nbsp;40 phút ·
                một báo cáo chung với band tổng có trọng số và nhận xét quản lý thời gian.
              </p>
            </div>

            {authed === null && <div className="text-center text-navy-400 py-10">Đang kiểm tra đăng nhập…</div>}

            {authed === false && (
              <div className="bg-navy-800 border border-brand-500/40 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-3xl mx-auto mb-5">✦</div>
                <h2 className="text-xl font-semibold text-white mb-2">Đăng nhập để bắt đầu thi thử</h2>
                <p className="text-navy-300 text-base mb-6 max-w-xs mx-auto leading-relaxed">
                  Cần đăng nhập trước khi bắt đầu vì bài thi có tính giờ — đăng nhập giữa chừng sẽ mất thời gian làm bài.
                </p>
                <Link href="/login?next=/mock" className="btn-foil px-8 py-3 rounded-xl font-semibold text-base inline-block shadow-lg shadow-brand-500/20">
                  Đăng nhập với Google
                </Link>
              </div>
            )}

            {authed === true && (
              <div className="space-y-6">
                <QuotaNotice />

                {/* Đề gợi ý — đường đi mặc định, không bắt học viên phải chọn */}
                <div className="bg-navy-800 border-2 border-brand-500/40 rounded-2xl p-6">
                  <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
                    <span className="text-xs font-mono uppercase tracking-widest text-brand-400">Đề gợi ý cho bạn</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-navy-600 text-navy-400">
                      {LEVEL_LABEL[suggested.level]}
                    </span>
                  </div>
                  <PaperSummary paper={suggested} big />
                  <button onClick={() => startTest('full', suggested)}
                    className="w-full btn-foil py-3.5 rounded-xl text-lg font-semibold mt-5 shadow-lg shadow-brand-500/25">
                    Bắt đầu — 60 phút →
                  </button>
                  <p className="text-[11px] text-navy-500 text-center mt-3">
                    Task 1 (20 phút) tự chuyển sang Task 2 (40 phút) khi hết giờ, đúng như phòng thi.
                  </p>
                </div>

                {/* Toàn bộ ngân hàng đề */}
                <div>
                  <button onClick={() => setShowAllPapers(v => !v)}
                    className="w-full text-sm font-mono text-navy-300 border border-navy-700 rounded-xl py-3 hover:border-brand-500/40 transition">
                    {showAllPapers ? '▲ Thu gọn' : `▼ Chọn đề khác (${TEST_PAPERS.length} đề)`}
                  </button>
                  {showAllPapers && (
                    <div className="grid gap-3 sm:grid-cols-2 mt-3">
                      {TEST_PAPERS.map(p => (
                        <button key={p.id} onClick={() => startTest('full', p)}
                          className="text-left p-4 rounded-xl border border-navy-700 bg-navy-800 hover:border-brand-500/50 transition">
                          <div className="flex items-baseline justify-between gap-2 mb-2">
                            <span className="text-sm font-semibold text-white">
                              Đề {String(p.no).padStart(2, '0')}
                              {donePapers.includes(p.id) && <span className="text-brand-400 ml-2 text-xs">✓ đã làm</span>}
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{LEVEL_LABEL[p.level]}</span>
                          </div>
                          <PaperSummary paper={p} />
                        </button>
                      ))}
                      <p className="text-[11px] text-navy-500 sm:col-span-2 leading-relaxed">
                        {LEVEL_HINT.foundation} · {LEVEL_HINT.standard} · {LEVEL_HINT.challenge}
                      </p>
                    </div>
                  )}
                </div>

                {/* Luyện lẻ, đề bốc ngẫu nhiên */}
                <div className="border-t border-navy-700 pt-5">
                  <div className="text-xs font-mono uppercase tracking-widest text-navy-500 mb-3">Hoặc luyện lẻ một phần</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button onClick={() => startTest('task1', null)}
                      className="text-left p-4 rounded-xl border border-navy-700 bg-navy-800 hover:border-brand-500/50 transition">
                      <div className="text-sm font-semibold text-white mb-1">Task 1 · 20 phút</div>
                      <div className="text-xs text-navy-400">Đề bốc ngẫu nhiên trong {TASK1_BANK.length} đề, ưu tiên đề chưa gặp.</div>
                    </button>
                    <button onClick={() => startTest('task2', null)}
                      className="text-left p-4 rounded-xl border border-navy-700 bg-navy-800 hover:border-brand-500/50 transition">
                      <div className="text-sm font-semibold text-white mb-1">Task 2 · 40 phút</div>
                      <div className="text-xs text-navy-400">Đề bốc ngẫu nhiên trong {TASK2_BANK.length} đề, đủ 5 dạng câu hỏi.</div>
                    </button>
                  </div>
                  <p className="text-[11px] text-navy-500 mt-3">
                    Luyện lẻ vẫn có nhận xét thời gian, nhưng không có band Writing tổng — band tổng cần cả hai phần.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {(phase === 'running' || phase === 'grading') && (
          <div className="animate-fade-up space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3 bg-navy-800 border border-navy-700 rounded-xl px-5 py-3 sticky top-2 z-10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-navy-700 border border-navy-600 text-navy-300">
                  Task {currentTaskType}
                </span>
                {paper && !isExam && <span className="text-xs text-navy-500">Đề {String(paper.no).padStart(2, '0')}</span>}
                {mode === 'full' && <span className="text-xs text-navy-500">{stage === 'task1' ? '1/2' : '2/2'}</span>}
              </div>
              <div className={`text-2xl font-mono font-bold tabular-nums ${timerColor}`}>{formatTime(timeLeft)}</div>
              <div className={`text-sm font-mono ${wc < minWords ? 'text-amber-500' : 'text-green-500'}`}>{wc} / {minWords}+ từ</div>
            </div>

            {mode === 'full' && stage === 'task2' && (
              <div className="text-xs text-navy-500 italic text-center">
                🕓 Task 1 đang được chấm ở nền — cả hai phần sẽ hiện cùng lúc khi bạn nộp Task 2.
              </div>
            )}

            {stage === 'task1' && task1 && (
              <>
                <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5">
                  <p className="text-base text-navy-100 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>{task1.instruction}</p>
                </div>
                <TaskVisual task={task1} />
              </>
            )}

            {stage === 'task2' && task2 && (
              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6">
                <p className="text-lg text-navy-100 leading-relaxed italic" style={{ fontFamily: 'Georgia, serif' }}>{task2.prompt}</p>
              </div>
            )}

            <textarea
              value={currentEssay}
              onChange={e => onType(e.target.value)}
              onPaste={() => { traceRef.current[stage].pasteCount += 1; }}
              disabled={phase === 'grading'}
              placeholder="Viết bài của bạn vào đây…"
              spellCheck={false}
              className="w-full bg-navy-800 border border-navy-700 rounded-xl p-4 text-white placeholder-navy-500 focus:border-brand-500 outline-none resize-y min-h-[320px] text-base leading-relaxed"
            />
            <p className="text-[11px] text-navy-500 -mt-2">
              Kiểm tra chính tả đã tắt, giống phòng thi CD-IELTS thật.
            </p>

            <button onClick={() => handleSubmitStage(false)} disabled={phase === 'grading'}
              className="w-full btn-foil py-3.5 rounded-xl text-lg font-semibold hover:-translate-y-0.5 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-60">
              {phase === 'grading'
                ? (gradingLabel || 'Đang chấm bài…')
                : (mode === 'full' && stage === 'task1' ? 'Nộp & sang Task 2 →' : '✦ Nộp bài & xem kết quả')}
            </button>
          </div>
        )}

        {phase === 'result' && result && <MockReport r={result} onRetake={resetToSelect} locked={isExam} />}
      </main>
    </div>
  );
}

const CHART_LABEL: Record<string, string> = {
  bar: 'Biểu đồ cột', line: 'Biểu đồ đường', pie: 'Biểu đồ tròn',
  table: 'Bảng số liệu', process: 'Sơ đồ quy trình', map: 'Bản đồ',
};
const T2_LABEL: Record<string, string> = {
  opinion: 'Nêu quan điểm', discussion: 'Thảo luận hai chiều',
  'problem-solution': 'Nguyên nhân – giải pháp', 'adv-disadv': 'Lợi và hại', 'two-part': 'Hai câu hỏi',
};

/** Tóm tắt một đề: hai phần bên trong và lý do đề tồn tại. */
function PaperSummary({ paper, big = false }: { paper: TestPaper; big?: boolean }) {
  let parts: { task1: Task1Item; task2: Task2Item } | null = null;
  try { parts = resolvePaper(paper); } catch { parts = null; }
  if (!parts) return <p className="text-xs text-red-400">Đề này đang thiếu dữ liệu.</p>;

  return (
    <div className="space-y-2">
      <div className={big ? 'text-base text-white font-semibold leading-snug' : 'text-xs text-navy-300 leading-snug'}>
        {paper.focus}
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="flex gap-2 items-baseline">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 flex-shrink-0 w-12">Task 1</span>
          <span className={big ? 'text-sm text-navy-200' : 'text-xs text-navy-400'}>
            {CHART_LABEL[parts.task1.chartType] ?? parts.task1.chartType} · {parts.task1.title}
          </span>
        </div>
        <div className="flex gap-2 items-baseline">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 flex-shrink-0 w-12">Task 2</span>
          <span className={big ? 'text-sm text-navy-200' : 'text-xs text-navy-400'}>
            {T2_LABEL[parts.task2.type] ?? parts.task2.type}
            {big && <> · <span className="italic">{parts.task2.prompt.slice(0, 110)}…</span></>}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Một bài thi trọn vẹn tiêu HAI lượt chấm, mà tài khoản miễn phí chỉ có một
 * lượt mỗi tuần. Phải nói điều đó TRƯỚC khi học viên ngồi xuống 60 phút —
 * biết sau khi thi xong là một trải nghiệm tệ mà chúng ta tự gây ra.
 */
function QuotaNotice() {
  const { isPaid, loading, freeLeft, hasFreeFullAccess } = useEntitlement();
  if (loading || isPaid || hasFreeFullAccess) return null;

  const enough = freeLeft >= 2;
  return (
    <div className={`rounded-xl px-5 py-4 border ${enough ? 'border-navy-700 bg-navy-800' : 'border-amber-500/40 bg-amber-500/5'}`}>
      <div className="text-sm text-navy-200 leading-relaxed">
        {enough ? (
          <>Một bài thi trọn vẹn dùng <strong className="text-white">2 lượt chấm</strong> (mỗi phần một lượt). Tuần này bạn còn {freeLeft} lượt.</>
        ) : freeLeft === 1 ? (
          <>Tuần này bạn còn <strong className="text-amber-300">1 lượt chấm</strong>, trong khi bài thi trọn vẹn cần 2 — Task 2 sẽ không chấm được.
            Bạn vẫn thi được và vẫn nhận đủ phần nhận xét thời gian, nhưng để có band Writing tổng thì cần nâng cấp, hoặc luyện lẻ từng phần ở hai tuần khác nhau.</>
        ) : (
          <>Tuần này bạn đã hết lượt chấm miễn phí. Bài thi vẫn tính giờ và vẫn có nhận xét quản lý thời gian, nhưng hai bài viết sẽ chưa được chấm điểm.</>
        )}
      </div>
      {!enough && (
        <Link href="/pricing" className="btn-foil inline-block mt-3 px-5 py-2 rounded-lg text-sm font-semibold">
          Xem gói nâng cấp
        </Link>
      )}
    </div>
  );
}
