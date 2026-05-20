import { describe, expect, it } from "vitest";
import { analyzeSensorReadings, parseSensorCsv } from "../../src/shared/sensor.js";

describe("sensor analyzer", () => {
  it("flags large temperature deviation", () => {
    const alerts = analyzeSensorReadings(1, [
      { timestamp: "2026-05-19T09:00:00Z", tempC: 24, targetTempC: 24, note: "start" },
      { timestamp: "2026-05-19T10:00:00Z", tempC: 160, targetTempC: 100, note: "too hot" }
    ], "scheduled");

    expect(alerts).toContainEqual(expect.objectContaining({
      type: "TEMP_DEVIATION",
      severity: "warning"
    }));
  });

  it("flags excessive ramp rate", () => {
    const alerts = analyzeSensorReadings(1, [
      { timestamp: "2026-05-19T09:00:00Z", tempC: 24, targetTempC: 24, note: "start" },
      { timestamp: "2026-05-19T10:00:00Z", tempC: 240, targetTempC: 230, note: "fast ramp" }
    ], "scheduled");

    expect(alerts).toContainEqual(expect.objectContaining({
      type: "RAMP_RATE_HIGH",
      message: expect.stringContaining("180")
    }));
  });

  it("parses quoted CSV fields without eval", () => {
    const readings = parseSensorCsv("timestamp,tempC,targetTempC,note\n2026-05-19T09:00:00Z,24,24,\"start, kiln closed\"");

    expect(readings).toEqual([
      {
        timestamp: "2026-05-19T09:00:00Z",
        tempC: 24,
        targetTempC: 24,
        note: "start, kiln closed"
      }
    ]);
  });
});
