import { Icon } from './Icon';

export function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="error-banner">
      <Icon.Alert className="icon" size={20} />
      <div>{error}</div>
    </div>
  );
}
