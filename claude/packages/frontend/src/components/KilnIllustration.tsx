// Kiln cross-section illustration with CSS-driven flame animation.
// Used as the main visual signature on Dashboard and Login.

import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & {
  size?: number;
  /** true = animated flame and ember glow; enabled by default */
  active?: boolean;
};

export function KilnIllustration({ size = 280, active = true, ...rest }: Props) {
  const flameClass = active ? 'flame-flicker' : '';
  const emberClass = active ? 'ember-glow' : '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      className="kiln-illustration"
      role="img"
      aria-label="Lò nung gốm với ngọn lửa bên trong"
      {...rest}
    >
      <defs>
        <linearGradient id="kiln-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a3621" />
          <stop offset="60%" stopColor="#3a2114" />
          <stop offset="100%" stopColor="#1d0e07" />
        </linearGradient>
        <linearGradient id="kiln-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4626" />
          <stop offset="100%" stopColor="#3a2114" />
        </linearGradient>
        <radialGradient id="ember" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff2c4" />
          <stop offset="35%" stopColor="#ffb56b" />
          <stop offset="70%" stopColor="#e0531a" />
          <stop offset="100%" stopColor="#7a2f08" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="flame-inner" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#fff5d1" />
          <stop offset="35%" stopColor="#ffce7a" />
          <stop offset="70%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#e0531a" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff8a3d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brick" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b4a26" />
          <stop offset="100%" stopColor="#5a2c14" />
        </linearGradient>
      </defs>

      {/* Hào quang ấm phía sau lò */}
      <circle cx="120" cy="135" r="105" fill="url(#halo)" />

      {/* Ống khói */}
      <rect x="98" y="18" width="20" height="34" rx="3" fill="url(#kiln-edge)" />
      <rect x="92" y="14" width="32" height="10" rx="3" fill="url(#kiln-edge)" />
      {/* Khói nhẹ */}
      {active && (
        <g opacity="0.5" className={emberClass}>
          <ellipse cx="108" cy="10" rx="10" ry="4" fill="#d8c2a0" opacity="0.4" />
          <ellipse cx="118" cy="4" rx="7" ry="3" fill="#d8c2a0" opacity="0.3" />
        </g>
      )}

      {/* Mái vòm lò */}
      <path
        d="M30 90 Q30 50 120 50 Q210 50 210 90 L210 95 L30 95 Z"
        fill="url(#kiln-body)"
        stroke="#1c0e07"
        strokeWidth="1.5"
      />

      {/* Thân lò chính */}
      <rect
        x="30"
        y="92"
        width="180"
        height="115"
        fill="url(#kiln-body)"
        stroke="#1c0e07"
        strokeWidth="1.5"
      />

      {/* Bệ đỡ */}
      <rect x="22" y="207" width="196" height="14" rx="2" fill="url(#brick)" stroke="#1c0e07" />
      {/* Đường gạch */}
      <line x1="60" y1="207" x2="60" y2="221" stroke="#1c0e07" strokeOpacity="0.35" />
      <line x1="100" y1="207" x2="100" y2="221" stroke="#1c0e07" strokeOpacity="0.35" />
      <line x1="140" y1="207" x2="140" y2="221" stroke="#1c0e07" strokeOpacity="0.35" />
      <line x1="180" y1="207" x2="180" y2="221" stroke="#1c0e07" strokeOpacity="0.35" />

      {/* Đường viền gạch ngang trên thân */}
      <line x1="30" y1="120" x2="210" y2="120" stroke="#1c0e07" strokeOpacity="0.45" />
      <line x1="30" y1="155" x2="210" y2="155" stroke="#1c0e07" strokeOpacity="0.45" />
      <line x1="30" y1="190" x2="210" y2="190" stroke="#1c0e07" strokeOpacity="0.45" />

      {/* Khung cửa quan sát */}
      <rect
        x="78"
        y="108"
        width="84"
        height="80"
        rx="6"
        fill="#1c0e07"
        stroke="#5a3621"
        strokeWidth="2.5"
      />

      {/* Ánh than đỏ rực qua cửa */}
      <rect
        x="82"
        y="112"
        width="76"
        height="72"
        rx="4"
        fill="url(#ember)"
        className={emberClass}
      />

      {/* Kệ trong lò (lờ mờ qua than) */}
      <g opacity="0.35">
        <line x1="86" y1="138" x2="154" y2="138" stroke="#3a1607" strokeWidth="2" />
        <line x1="86" y1="160" x2="154" y2="160" stroke="#3a1607" strokeWidth="2" />
      </g>

      {/* Bình gốm trên kệ */}
      <g opacity="0.55">
        <ellipse cx="100" cy="138" rx="6" ry="2.5" fill="#3a1607" />
        <path d="M96 138 q-2 6 0 14 q2 4 8 4 q6 0 8 -4 q2 -8 0 -14 z" fill="#3a1607" />
        <ellipse cx="130" cy="160" rx="7" ry="2.5" fill="#3a1607" />
        <path d="M125 160 q-2 8 0 16 q3 4 10 4 q7 0 10 -4 q2 -8 0 -16 z" fill="#3a1607" />
      </g>

      {/* Ngọn lửa trung tâm */}
      <g className={flameClass}>
        <path
          d="M120 178
             C 110 168 108 155 116 142
             C 118 150 124 152 122 138
             C 124 130 132 124 128 112
             C 138 122 144 138 142 152
             C 148 150 150 142 148 134
             C 156 146 156 162 148 176
             C 144 182 132 184 120 178 Z"
          fill="url(#flame-inner)"
        />
      </g>

      {/* Ngọn lửa nhỏ bên trái */}
      <g className={`${flameClass} fast`} style={{ transformOrigin: '95px 178px' }}>
        <path
          d="M95 184
             C 88 178 88 168 94 160
             C 96 166 100 166 98 158
             C 102 164 104 172 102 178
             C 100 182 98 184 95 184 Z"
          fill="url(#flame-inner)"
          opacity="0.85"
        />
      </g>

      {/* Ngọn lửa nhỏ bên phải */}
      <g className={`${flameClass} slow`} style={{ transformOrigin: '148px 180px' }}>
        <path
          d="M148 186
             C 142 180 142 170 148 162
             C 150 168 154 168 152 160
             C 156 166 158 174 156 180
             C 154 184 152 186 148 186 Z"
          fill="url(#flame-inner)"
          opacity="0.8"
        />
      </g>

      {/* Đốm than nhỏ rơi xuống */}
      {active && (
        <g className={emberClass}>
          <circle cx="100" cy="195" r="1.5" fill="#ffce7a" />
          <circle cx="140" cy="198" r="1" fill="#ffb56b" />
          <circle cx="120" cy="200" r="1.2" fill="#fff2c4" />
        </g>
      )}

      {/* Tay nắm cửa lò */}
      <circle cx="166" cy="148" r="2.5" fill="#8b4a26" stroke="#1c0e07" strokeWidth="0.8" />
    </svg>
  );
}
