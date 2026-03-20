'use client';

interface RiskScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score <= 30) return '#00ff88';
  if (score <= 60) return '#f59e0b';
  if (score <= 80) return '#f97316';
  return '#ff3366';
}

function getScoreLabel(score: number): string {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export default function RiskScoreBadge({ score, size = 'md' }: RiskScoreBadgeProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const dimensions = {
    sm: { outer: 40, inner: 34, stroke: 3, text: '11px', label: '7px' },
    md: { outer: 56, inner: 48, stroke: 4, text: '15px', label: '8px' },
    lg: { outer: 80, inner: 70, stroke: 5, text: '22px', label: '9px' },
  }[size];

  const radius = (dimensions.inner - dimensions.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: dimensions.outer, height: dimensions.outer }}>
      <svg
        width={dimensions.inner}
        height={dimensions.inner}
        className="transform -rotate-90"
      >
        <circle
          cx={dimensions.inner / 2}
          cy={dimensions.inner / 2}
          r={radius}
          fill="none"
          stroke="#1e2130"
          strokeWidth={dimensions.stroke}
        />
        <circle
          cx={dimensions.inner / 2}
          cy={dimensions.inner / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={dimensions.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold leading-none"
          style={{ fontSize: dimensions.text, color }}
        >
          {score}
        </span>
        {size !== 'sm' && (
          <span
            className="font-mono font-medium leading-none mt-0.5"
            style={{ fontSize: dimensions.label, color }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
