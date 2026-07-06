'use client';

/**
 * ScorePanel — composite component that renders:
 *   1. ScoreRadar (SVG radar chart for 4 IELTS criteria)
 *   2. Criterion progress bars
 *   3. ShareScore button
 *
 * Drop into evaluate/page.tsx with a single import.
 */
import { ScoreRadar } from './ScoreRadar';
import { ShareScore } from './ShareScore';

type Criterion = { band?: number } | null | undefined;
type Props = {
  ta: Criterion;
  cc: Criterion;
  lr: Criterion;
  gr: Criterion;
  overall: number;
  evalId: string;
};

const CRITERIA = [
  { key: 'Task Achievement',      shortKey: 'TA' },
  { key: 'Coherence & Cohesion',  shortKey: 'CC' },
  { key: 'Lexical Resource',      shortKey: 'LR' },
  { key: 'Grammatical Range',     shortKey: 'GR' },
] as const;

export function ScorePanel({ ta, cc, lr, gr, overall, evalId }: Props) {
  const scores = [ta?.band ?? 0, cc?.band ?? 0, lr?.band ?? 0, gr?.band ?? 0];
  const labels = ['Task Achievement', 'Coherence & Cohesion', 'Lexical Resource', 'Grammatical Range'];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-5 px-5 bg-navy-800 border border-navy-700 rounded-xl mb-4">
      {/* Radar */}
      <div className="shrink-0">
        <ScoreRadar
          ta={scores[0]}
          cc={scores[1]}
          lr={scores[2]}
          gr={scores[3]}
          overall={overall}
          size={200}
        />
      </div>

      {/* Bars + share */}
      <div className="flex-1 w-full flex flex-col gap-2">
        <p className="text-[10px] font-mono text-navy-500 uppercase tracking-widest mb-1">Điểm từng tiêu chí</p>
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-navy-400 w-40 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(scores[i] / 9) * 100}%`,
                  background: 'linear-gradient(90deg,#8A6A28,#E7CE8E 50%,#C8A14B)',
                }}
              />
            </div>
            <span className="text-xs font-mono text-brand-400 w-7 text-right tabular-nums">
              {scores[i] > 0 ? scores[i].toFixed(1) : '—'}
            </span>
          </div>
        ))}

        <div className="mt-3 flex justify-end">
          <ShareScore evaluationId={evalId} disabled={!evalId} />
        </div>
      </div>
    </div>
  );
}
