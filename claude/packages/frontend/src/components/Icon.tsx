// Lightweight inline SVG icons for KilnFlow. Avoids an icon dependency and
// keeps the bundle small. Icons inherit color through currentColor.

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

export const Icon = {
  Dashboard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  Stack: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3 2 8l10 5 10-5-10-5z" />
      <path d="M2 14l10 5 10-5" />
      <path d="M2 19l10 5 10-5" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Wand: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M15 7l-1.2 1.2M7 21l13-13-2-2L5 19l2 2z" />
    </svg>
  ),
  Flame: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2s5 4 5 9a5 5 0 1 1-10 0c0-2 1-3.5 2-4.5 1 1.5 2 2 2-1.5C11 3.5 12 2 12 2z" />
    </svg>
  ),
  Kiln: (p: IconProps) => (
    // Kiln cross-section: square body, arch roof, and center peephole.
    <svg {...base(p)}>
      <path d="M5 21V9a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v12" />
      <path d="M3 21h18" />
      <rect x="9" y="11" width="6" height="6" rx="0.8" />
      <path d="M12 14.5v1" strokeWidth="1.2" />
    </svg>
  ),
  Pot: (p: IconProps) => (
    // Ceramic vase with a narrowed neck and flared lip.
    <svg {...base(p)}>
      <path d="M8 4h8" />
      <path d="M9 4v3a3 3 0 0 1-1 2.2A6 6 0 0 0 6 14v3a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-3a6 6 0 0 0-2-4.8A3 3 0 0 1 15 7V4" />
    </svg>
  ),
  Sparkles: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  ),
  Alert: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2 1 21h22L12 2z" />
      <path d="M12 9v5M12 17.5v.5" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  Filter: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />
    </svg>
  ),
  Calendar: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  Clock: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  Logout: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h12" />
    </svg>
  ),
  User: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  Note: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 3h11l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M8 12h8M8 16h6M8 8h6" />
    </svg>
  ),
  Upload: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 4v12M7 9l5-5 5 5M5 20h14" />
    </svg>
  ),
  Box: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
  Refresh: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 12a9 9 0 0 1 15.5-6.5L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.5L3 16M3 21v-5h5" />
    </svg>
  ),
  TrendUp: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />
    </svg>
  ),
  Inbox: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 13l3-9h12l3 9" />
      <path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6h-6a3 3 0 0 1-6 0H3z" />
    </svg>
  ),
};
