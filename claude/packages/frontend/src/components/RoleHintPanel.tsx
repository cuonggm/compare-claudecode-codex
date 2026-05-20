import type { Role } from '@kilnflow/shared';
import { PAGE_CAPABILITY } from '../state/roleGuide';
import { roleLabel } from '../i18n';
import { Icon } from './Icon';

// Compact hint under PageHeader that explains what the current role can do on
// the page without making users probe disabled controls.
export function RoleHintPanel({
  pageId,
  role,
}: {
  pageId: keyof typeof PAGE_CAPABILITY;
  role: Role;
}) {
  const items = PAGE_CAPABILITY[pageId][role];
  if (!items || items.length === 0) return null;

  return (
    <aside className="role-hint" aria-label={`Quyền của ${roleLabel[role]} trên trang này`}>
      <div className="role-hint-head">
        <span className="role-hint-icon" aria-hidden="true">
          <Icon.User size={14} />
        </span>
        <span>
          Vai trò <strong>{roleLabel[role]}</strong> ở trang này có thể:
        </span>
      </div>
      <ul className="role-hint-list">
        {items.map((it) => (
          <li key={it}>
            <Icon.Check size={12} /> {it}
          </li>
        ))}
      </ul>
    </aside>
  );
}
