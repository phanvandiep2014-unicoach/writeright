'use client';
import { useEffect, useRef, useState } from 'react';
import { TASK_MINUTES, formatClock, taskKey, timerState, wordsPerMinute } from '@/lib/practice-timer';

/**
 * Đồng hồ tuỳ chọn cho luyện viết. Không tự nộp bài, không khoá ô nhập:
 * chỉ giúp học viên tập quen nhịp thi thật (Task 1: 20 phút, Task 2: 40 phút).
 * Đổi loại đề thì đồng hồ dừng lại để khỏi tính nhầm thời gian.
 */
export function PracticeTimer({ taskType, wordCount }: { taskType: number; wordCount: number }) {
  const task = taskKey(taskType);
  const total = TASK_MINUTES[task] * 60;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now();
    const id = setInterval(() => {
      setElapsed(base.current + Math.floor((Date.now() - (startedAt.current as number)) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  // Đổi loại đề: dừng và đặt lại.
  useEffect(() => { setRunning(false); setElapsed(0); base.current = 0; }, [task]);

  const remaining = total - elapsed;
  const state = timerState(remaining);
  const wpm = wordsPerMinute(wordCount, elapsed);
  const color = state === 'over' ? 'text-red-400' : state === 'warn' ? 'text-amber-400' : 'text-brand-400';

  function toggle() {
    if (running) { base.current = elapsed; setRunning(false); }
    else setRunning(true);
  }
  function reset() { setRunning(false); setElapsed(0); base.current = 0; }

  return (
    <div className="flex items-center gap-3 flex-wrap text-sm mt-2" role="group" aria-label="Đồng hồ luyện viết">
      <span className={`font-mono text-lg tabular-nums ${color}`} aria-live="off">
        {state === 'over' ? `Quá giờ +${formatClock(-remaining)}` : formatClock(remaining)}
      </span>
      <button type="button" onClick={toggle} className="px-3 py-1 rounded-lg border border-brand-500/50 text-brand-400 hover:bg-brand-500/10 transition">
        {running ? 'Tạm dừng' : elapsed > 0 ? 'Tiếp tục' : `Bấm giờ ${TASK_MINUTES[task]} phút`}
      </button>
      {elapsed > 0 && (
        <button type="button" onClick={reset} className="px-3 py-1 rounded-lg text-navy-400 hover:text-white transition">Đặt lại</button>
      )}
      {wpm !== null && <span className="text-navy-400">~{wpm} từ/phút</span>}
    </div>
  );
}
