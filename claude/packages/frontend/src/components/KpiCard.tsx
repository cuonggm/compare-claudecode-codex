import type { ReactNode } from 'react';

export function KpiCard({
  label,
  value,
  help,
  tone = 'default',
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  help?: ReactNode;
  tone?: 'default' | 'warning' | 'success' | 'critical';
  icon?: ReactNode;
}) {
  const toneClass = tone === 'default' ? '' : `tone-${tone}`;
  return (
    <div className={`card kpi ${toneClass}`.trim()}>
      {icon && <div className="kpi-icon" aria-hidden="true">{icon}</div>}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {help && <div className="help">{help}</div>}
    </div>
  );
}
