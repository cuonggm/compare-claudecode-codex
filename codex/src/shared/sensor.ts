import type { Alert, LoadStatus, SensorReading } from "./domain.js";

export type SensorAlert = Omit<Alert, "id" | "createdAt"> & {
  createdAt?: string;
};

export function parseSensorCsv(csvText: string): SensorReading[] {
  const rows = parseCsvRows(csvText.trim());
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  const normalizedHeader = header.map((cell) => cell.trim());
  const expectedHeader = ["timestamp", "tempC", "targetTempC", "note"];

  if (expectedHeader.some((column, index) => normalizedHeader[index] !== column)) {
    throw new Error("Header CSV phải là timestamp,tempC,targetTempC,note");
  }

  return dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row, index) => {
      const [timestamp, tempCText, targetTempCText, note = ""] = row;
      const tempC = Number(tempCText);
      const targetTempC = Number(targetTempCText);

      if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
        throw new Error(`Dòng ${index + 2} có timestamp không hợp lệ.`);
      }

      if (!Number.isFinite(tempC) || !Number.isFinite(targetTempC)) {
        throw new Error(`Dòng ${index + 2} có giá trị nhiệt độ không hợp lệ.`);
      }

      return {
        timestamp,
        tempC,
        targetTempC,
        note
      };
    });
}

export function analyzeSensorReadings(loadId: number, readings: SensorReading[], loadStatus: LoadStatus): SensorAlert[] {
  const alerts: SensorAlert[] = [];
  const sorted = [...readings].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  for (const reading of sorted) {
    const deviation = Math.abs(reading.tempC - reading.targetTempC);
    if (deviation >= 50) {
      alerts.push({
        loadId,
        type: "TEMP_DEVIATION",
        severity: deviation >= 100 ? "critical" : "warning",
        message: `Nhiệt độ lệch ${Math.round(deviation)}°C tại ${reading.timestamp}.`
      });
    }
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const hours = (Date.parse(current.timestamp) - Date.parse(previous.timestamp)) / 3_600_000;
    if (hours <= 0) continue;

    const delta = current.tempC - previous.tempC;
    const rampRate = delta / hours;

    if (rampRate > 180) {
      alerts.push({
        loadId,
        type: "RAMP_RATE_HIGH",
        severity: rampRate > 260 ? "critical" : "warning",
        message: `Tốc độ tăng nhiệt ${Math.round(rampRate)}°C/giờ vượt giới hạn 180°C/giờ.`
      });
    }

    if (loadStatus === "firing" && delta < -25) {
      alerts.push({
        loadId,
        type: "UNEXPECTED_TEMP_DROP",
        severity: "critical",
        message: `Nhiệt độ giảm ${Math.abs(Math.round(delta))}°C khi mẻ đang nung.`
      });
    }
  }

  return alerts;
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      currentCell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  if (inQuotes) {
    throw new Error("CSV có trường đặt trong dấu nháy nhưng chưa đóng.");
  }

  return rows;
}
