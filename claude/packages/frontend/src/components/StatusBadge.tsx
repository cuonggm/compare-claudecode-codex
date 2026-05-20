import type { AlertSeverity, LoadStatus } from '@kilnflow/shared';
import { alertSeverityLabel, loadStatusLabel } from '../i18n';

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  const label = loadStatusLabel[status];
  return (
    <span className={`badge status-${status}`} aria-label={`Trạng thái: ${label}`}>
      {label}
    </span>
  );
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const label = alertSeverityLabel[severity];
  return (
    <span className={`badge severity-${severity}`} aria-label={`Mức độ: ${label}`}>
      {label}
    </span>
  );
}
