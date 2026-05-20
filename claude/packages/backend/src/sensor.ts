// Sensor CSV parser + alert analyzer.
//
// Parser: line-by-line CSV split. No eval; tolerates CRLF, blank lines and a
// header row in any column order matching the canonical four fields.
// Analyzer flags:
//   - |tempC - targetTempC| >= TEMP_DEVIATION_THRESHOLD
//   - ramp rate between two consecutive readings > MAX_RAMP_RATE_C_PER_HOUR
//   - unexpected cool-down when load is in 'firing' status

import type { Alert, AlertSeverity, LoadStatus, SensorReading } from '@kilnflow/shared';

export const TEMP_DEVIATION_THRESHOLD = 50;
export const MAX_RAMP_RATE_C_PER_HOUR = 180;

export interface ParsedReading {
  timestamp: string;
  tempC: number;
  targetTempC: number;
  note: string;
}

export class CsvParseError extends Error {
  constructor(public line: number, message: string) {
    super(`Dòng ${line}: ${message}`);
  }
}

const REQUIRED_HEADERS = ['timestamp', 'tempC', 'targetTempC', 'note'];

export function parseSensorCsv(text: string): ParsedReading[] {
  if (!text || !text.trim()) return [];
  const rows = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (rows.length === 0) return [];

  const headerCells = splitCsvLine(rows[0]).map((c) => c.trim());
  const headerMap: Record<string, number> = {};
  let hasHeader = REQUIRED_HEADERS.every((h) =>
    headerCells.some((c) => c.toLowerCase() === h.toLowerCase()),
  );
  if (hasHeader) {
    headerCells.forEach((c, i) => {
      headerMap[c.toLowerCase()] = i;
    });
  } else {
    // Assume canonical column order if no header.
    REQUIRED_HEADERS.forEach((h, i) => {
      headerMap[h.toLowerCase()] = i;
    });
  }

  const tsIdx = headerMap['timestamp'];
  const tempIdx = headerMap['tempc'];
  const tgtIdx = headerMap['targettempc'];
  const noteIdx = headerMap['note'];

  if (tsIdx === undefined || tempIdx === undefined || tgtIdx === undefined) {
    throw new CsvParseError(1, 'Thiếu cột bắt buộc (timestamp, tempC, targetTempC).');
  }

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const out: ParsedReading[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const lineNum = i + (hasHeader ? 2 : 1);
    const cells = splitCsvLine(dataRows[i]);
    const ts = (cells[tsIdx] ?? '').trim();
    const temp = Number((cells[tempIdx] ?? '').trim());
    const target = Number((cells[tgtIdx] ?? '').trim());
    const note = noteIdx !== undefined ? (cells[noteIdx] ?? '').trim() : '';

    if (!ts) throw new CsvParseError(lineNum, 'Thiếu timestamp.');
    const parsedTs = new Date(ts);
    if (Number.isNaN(parsedTs.getTime())) {
      throw new CsvParseError(lineNum, `Timestamp "${ts}" không hợp lệ.`);
    }
    if (Number.isNaN(temp)) throw new CsvParseError(lineNum, 'tempC không hợp lệ.');
    if (Number.isNaN(target)) throw new CsvParseError(lineNum, 'targetTempC không hợp lệ.');
    out.push({
      timestamp: parsedTs.toISOString(),
      tempC: temp,
      targetTempC: target,
      note,
    });
  }
  return out;
}

// Minimal CSV cell splitter that respects double-quoted cells but does not
// implement full RFC 4180. The kiln CSVs are simple and authored by hand.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

export interface AnalyzeInput {
  existingReadings: SensorReading[];
  newReadings: SensorReading[];
  loadStatus: LoadStatus;
  now?: Date;
}

export interface AnalyzedAlert {
  severity: AlertSeverity;
  code: string;
  message: string;
  readingId: string;
}

export function analyzeReadings(input: AnalyzeInput): AnalyzedAlert[] {
  const alerts: AnalyzedAlert[] = [];
  const all = [...input.existingReadings, ...input.newReadings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const newIds = new Set(input.newReadings.map((r) => r.id));

  for (let i = 0; i < all.length; i++) {
    const r = all[i];
    if (!newIds.has(r.id)) continue;

    const deviation = Math.abs(r.tempC - r.targetTempC);
    if (deviation >= TEMP_DEVIATION_THRESHOLD) {
      alerts.push({
        severity: deviation >= 100 ? 'critical' : 'warning',
        code: 'TEMP_DEVIATION',
        message: `Nhiệt độ ${r.tempC}°C lệch ${deviation.toFixed(1)}°C so với mục tiêu ${r.targetTempC}°C.`,
        readingId: r.id,
      });
    }

    if (i > 0) {
      const prev = all[i - 1];
      const dtMs = new Date(r.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (dtMs > 0) {
        const dtHours = dtMs / (1000 * 60 * 60);
        const ramp = (r.tempC - prev.tempC) / dtHours;
        if (ramp > MAX_RAMP_RATE_C_PER_HOUR) {
          alerts.push({
            severity: 'warning',
            code: 'RAMP_TOO_FAST',
            message: `Tốc độ tăng nhiệt ${ramp.toFixed(0)}°C/giờ vượt giới hạn an toàn ${MAX_RAMP_RATE_C_PER_HOUR}°C/giờ.`,
            readingId: r.id,
          });
        }
        if (input.loadStatus === 'firing' && ramp < -MAX_RAMP_RATE_C_PER_HOUR) {
          alerts.push({
            severity: 'critical',
            code: 'UNEXPECTED_COOLDOWN',
            message: `Nhiệt độ tụt ${Math.abs(ramp).toFixed(0)}°C/giờ trong khi đang nung — có thể lò gặp sự cố.`,
            readingId: r.id,
          });
        }
      }
    }
  }

  return alerts;
}
