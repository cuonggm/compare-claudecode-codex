import type { Role } from '@kilnflow/shared';
import { PAGE_CAPABILITY } from '../state/roleGuide';
import { roleLabel } from '../i18n';
import { Icon } from './Icon';

// Thanh gợi ý ngắn nằm dưới PageHeader: "Trên trang này, vai trò X có thể…".
// Mục tiêu là user mới hiểu ngay phạm vi thao tác mà không cần nhấn thử từng nút.
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
