// Biểu đồ đường SVG cho dữ liệu cảm biến. Tự render gridlines, axis labels,
// area fill và callout cho điểm đo cuối. Tránh dependency để giữ bundle gọn.

import type { SensorReading } from '@kilnflow/shared';

const COLOR_ACTUAL = '#b35d2a';
const COLOR_ACTUAL_FILL = 'rgba(179, 93, 42, 0.16)';
const COLOR_TARGET = '#1958b8';
const COLOR_GRID = '#e8dcc8';
const COLOR_AXIS = '#a08e74';

export function SensorChart({ readings }: { readings: SensorReading[] }) {
  if (readings.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem 1rem' }}>
        <div className="empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l5-5 4 4 9-9" />
          </svg>
        </div>
        <h3>Chưa có dữ liệu cảm biến</h3>
        <p>Nhập CSV cảm biến để bắt đầu giám sát đợt nung.</p>
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const xs = readings.map((r) => new Date(r.timestamp).getTime());
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const allTemps = readings.flatMap((r) => [r.tempC, r.targetTempC]);
  const rawMinY = Math.min(...allTemps);
  const rawMaxY = Math.max(...allTemps);
  const pad = Math.max(2, (rawMaxY - rawMinY) * 0.1);
  const minY = Math.floor(rawMinY - pad);
  const maxY = Math.ceil(rawMaxY + pad);
  const yRange = maxY - minY || 1;
  const xRange = maxX - minX || 1;

  function px(x: number) {
    return padL + ((x - minX) / xRange) * innerW;
  }
  function py(y: number) {
    return padT + (1 - (y - minY) / yRange) * innerH;
  }

  const actualPoints = readings.map((r) => [
    px(new Date(r.timestamp).getTime()),
    py(r.tempC),
  ] as const);
  const targetPoints = readings.map((r) => [
    px(new Date(r.timestamp).getTime()),
    py(r.targetTempC),
  ] as const);

  const toPath = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  const actualPath = toPath(actualPoints);
  const targetPath = toPath(targetPoints);
  const fillPath = `${actualPath} L${actualPoints.at(-1)![0]} ${padT + innerH} L${actualPoints[0][0]} ${padT + innerH} Z`;

  const last = readings[readings.length - 1];
  const first = readings[0];
  const lastX = px(new Date(last.timestamp).getTime());
  const lastY = py(last.tempC);
  const diff = last.tempC - last.targetTempC;

  // Y axis ticks (5 buckets)
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(minY + (yRange * i) / 4));

  return (
    <div className="chart-card">
      <div className="chart-stats">
        <div className="chart-stat">
          <span className="stat-label">Nhiệt độ hiện tại</span>
          <span className="stat-value">{Math.round(last.tempC)}°C</span>
          <span className="stat-delta">
            Mục tiêu {Math.round(last.targetTempC)}°C ·{' '}
            {diff === 0 ? 'khớp mục tiêu' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}°`}
          </span>
        </div>
        <div className="chart-stat">
          <span className="stat-label">Đỉnh ghi nhận</span>
          <span className="stat-value">{Math.round(rawMaxY)}°C</span>
          <span className="stat-delta">trong {readings.length} điểm đo</span>
        </div>
        <div className="chart-stat">
          <span className="stat-label">Khoảng thời gian</span>
          <span className="stat-value">
            {Math.round((maxX - minX) / 60000)} phút
          </span>
          <span className="stat-delta">
            từ {new Date(first.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <figure
        aria-label={`Biểu đồ cảm biến: ${readings.length} điểm đo. Nhiệt độ gần nhất ${last.tempC}°C, mục tiêu ${last.targetTempC}°C.`}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-hidden="true">
          {/* Gridlines + Y axis */}
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={width - padR}
                y1={py(t)}
                y2={py(t)}
                stroke={COLOR_GRID}
                strokeDasharray="2 4"
              />
              <text
                x={padL - 6}
                y={py(t) + 3}
                fontSize="10"
                fill={COLOR_AXIS}
                textAnchor="end"
              >
                {t}°
              </text>
            </g>
          ))}
          {/* Axes */}
          <line
            x1={padL}
            y1={height - padB}
            x2={width - padR}
            y2={height - padB}
            stroke={COLOR_AXIS}
          />
          <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={COLOR_AXIS} />

          {/* Target line */}
          <path
            d={targetPath}
            stroke={COLOR_TARGET}
            strokeDasharray="5 4"
            fill="none"
            strokeWidth={1.75}
            strokeLinecap="round"
          />

          {/* Actual area + line */}
          <path d={fillPath} fill={COLOR_ACTUAL_FILL} />
          <path
            d={actualPath}
            stroke={COLOR_ACTUAL}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Last point callout */}
          <circle cx={lastX} cy={lastY} r="4" fill="#fff" stroke={COLOR_ACTUAL} strokeWidth={2} />

          {/* X axis labels: start + end */}
          <text x={padL} y={height - 10} fontSize="10" fill={COLOR_AXIS}>
            {new Date(first.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </text>
          <text
            x={width - padR}
            y={height - 10}
            fontSize="10"
            fill={COLOR_AXIS}
            textAnchor="end"
          >
            {new Date(last.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </text>
        </svg>

        <div className="chart-legend" role="presentation">
          <span className="swatch">Nhiệt độ thực tế</span>
          <span className="swatch target">Nhiệt độ mục tiêu</span>
        </div>
      </figure>
    </div>
  );
}
