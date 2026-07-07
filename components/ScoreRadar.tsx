'use client';

/**
 * ScoreRadar — 4-criterion IELTS band radar chart using pure SVG
 * No recharts dependency needed. Works with the existing brand palette.
 *
 * Props:
 *   ta, cc, lr, gr  — band scores (0–9, supports half bands)
 *   overall          — overall band (shown in centre)
 *   size             — SVG size in px (default 220)
 */

type Props = {
  ta: number;
  cc: number;
  lr: number;
  gr: number;
  overall: number;
  size?: number;
};

const MAX = 9;
const LABELS = ['TA', 'CC', 'LR', 'GR'];
const COLORS = {
  stroke: '#C8A14B',      // brand gold
  fill:   'rgba(200,161,75,0.18)',
  grid:   'rgba(255,255,255,0.08)',
  text:   '#9C8657',
};

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function ScoreRadar({ ta, cc, lr, gr, overall, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const scores = [ta, cc, lr, gr];
  const angles = [0, 90, 180, 270]; // top, right, bottom, left

  // Grid rings at 3, 5, 7, 9
  const rings = [3, 5, 7, 9];

  function ringPoints(val: number): string {
    return angles
      .map(a => {
        const r = (val / MAX) * maxR;
        const p = polarToXY(a, r, cx, cy);
        return `${p.x},${p.y}`;
      })
      .join(' ');
  }

  const dataPoints = scores.map((s, i) => {
    const r = (Math.min(s, MAX) / MAX) * maxR;
    return polarToXY(angles[i], r, cx, cy);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Band radar chart">
      {/* Grid rings */}
      {rings.map(r => (
        <polygon
          key={r}
          points={ringPoints(r)}
          fill="none"
          stroke={COLORS.grid}
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {angles.map((a, i) => {
        const end = polarToXY(a, maxR, cx, cy);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={end.x.toFixed(1)} y2={end.y.toFixed(1)}
            stroke={COLORS.grid}
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path d={dataPath} fill={COLORS.fill} stroke={COLORS.stroke} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill={COLORS.stroke} />
      ))}

      {/* Axis labels + scores */}
      {angles.map((a, i) => {
        const labelR = maxR + 22;
        const p = polarToXY(a, labelR, cx, cy);
        const scoreR = maxR + 10;
        const sp = polarToXY(a, (Math.min(scores[i], MAX) / MAX) * maxR - 14, cx, cy);
        return (
          <g key={i}>
            <text
              x={p.x.toFixed(1)} y={(p.y + 4).toFixed(1)}
              textAnchor="middle"
              fontSize="11"
              fontFamily="monospace"
              fill={COLORS.text}
              fontWeight="600"
            >
              {LABELS[i]}
            </text>
            <text
              x={sp.x.toFixed(1)} y={(sp.y + 4).toFixed(1)}
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fill={COLORS.stroke}
            >
              {scores[i].toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Overall band in centre */}
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fill="white"
        fontFamily="serif"
      >
        {overall.toFixed(1)}
      </text>
      <text
        x={cx} y={cy + 12}
        textAnchor="middle"
        fontSize="8"
        fill={COLORS.text}
        fontFamily="monospace"
        letterSpacing="1"
      >
        BAND
      </text>
    </svg>
  );
}
'use client';

/**
 * ScoreRadar — 4-criterion IELTS band radar chart using pure SVG
 * No recharts dependency needed. Works with the existing brand palette.
 *
 * Props:
 *   ta, cc, lr, gr  — band scores (0–9, supports half bands)
 *   overall          — overall band (shown in centre)
 *   size             — SVG size in px (default 220)
 */

type Props = {
  ta: number;
  cc: number;
  lr: number;
  gr: number;
  overall: number;
  size?: number;
};

const MAX = 9;
const LABELS = ['TA', 'CC', 'LR', 'GR'];
const COLORS = {
  stroke: '#C8A14B',      // brand gold
  fill:   'rgba(200,161,75,0.18)',
  grid:   'rgba(255,255,255,0.08)',
  text:   '#94A3B8',
};

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function ScoreRadar({ ta, cc, lr, gr, overall, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const scores = [ta, cc, lr, gr];
  const angles = [0, 90, 180, 270]; // top, right, bottom, left

  // Grid rings at 3, 5, 7, 9
  const rings = [3, 5, 7, 9];

  function ringPoints(val: number): string {
    return angles
      .map(a => {
        const r = (val / MAX) * maxR;
        const p = polarToXY(a, r, cx, cy);
        return `${p.x},${p.y}`;
      })
      .join(' ');
  }

  const dataPoints = scores.map((s, i) => {
    const r = (Math.min(s, MAX) / MAX) * maxR;
    return polarToXY(angles[i], r, cx, cy);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Band radar chart">
      {/* Grid rings */}
      {rings.map(r => (
        <polygon
          key={r}
          points={ringPoints(r)}
          fill="none"
          stroke={COLORS.grid}
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {angles.map((a, i) => {
        const end = polarToXY(a, maxR, cx, cy);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={end.x.toFixed(1)} y2={end.y.toFixed(1)}
            stroke={COLORS.grid}
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path d={dataPath} fill={COLORS.fill} stroke={COLORS.stroke} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill={COLORS.stroke} />
      ))}

      {/* Axis labels + scores */}
      {angles.map((a, i) => {
        const labelR = maxR + 22;
        const p = polarToXY(a, labelR, cx, cy);
        const scoreR = maxR + 10;
        const sp = polarToXY(a, (Math.min(scores[i], MAX) / MAX) * maxR - 14, cx, cy);
        return (
          <g key={i}>
            <text
              x={p.x.toFixed(1)} y={(p.y + 4).toFixed(1)}
              textAnchor="middle"
              fontSize="11"
              fontFamily="monospace"
              fill={COLORS.text}
              fontWeight="600"
            >
              {LABELS[i]}
            </text>
            <text
              x={sp.x.toFixed(1)} y={(sp.y + 4).toFixed(1)}
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fill={COLORS.stroke}
            >
              {scores[i].toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Overall band in centre */}
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fill="white"
        fontFamily="serif"
      >
        {overall.toFixed(1)}
      </text>
      <text
        x={cx} y={cy + 12}
        textAnchor="middle"
        fontSize="8"
        fill={COLORS.text}
        fontFamily="monospace"
        letterSpacing="1"
      >
        BAND
      </text>
    </svg>
  );
}
