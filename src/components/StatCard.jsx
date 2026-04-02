import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ label, value, trend, trendValue }) {
  const trendColor =
    trend === 'up'
      ? 'var(--color-success)'
      : trend === 'down'
        ? 'var(--color-danger)'
        : 'var(--color-text-secondary)';

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--color-text)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {(trend || trendValue) && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            color: trendColor,
          }}
        >
          <TrendIcon size={14} />
          {trendValue}
        </span>
      )}
    </div>
  );
}
