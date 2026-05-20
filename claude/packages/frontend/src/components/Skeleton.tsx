export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-row"
          style={{ width: `${70 + ((i * 17) % 30)}%` }}
        />
      ))}
    </div>
  );
}
