export function CapacityBar({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tone = clamped >= 95 ? 'danger' : clamped >= 80 ? 'hot' : '';
  return (
    <div className={`capacity ${tone}`.trim()}>
      <div className="capacity-label">
        <span>{label}</span>
        <span className="capacity-value">{percent}%</span>
      </div>
      <div
        className="capacity-bar"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percent} phần trăm`}
      >
        <span style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
