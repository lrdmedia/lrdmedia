const dotColors = {
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  red: 'var(--color-danger)',
  blue: 'var(--color-accent)',
  grey: 'var(--color-text-secondary)',
};

export default function StatusBadge({ status, label }) {
  const color = dotColors[status] || dotColors.grey;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '999px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
