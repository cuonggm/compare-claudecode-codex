import { describe, expect, it } from 'vitest';
import type { SensorReading } from '@kilnflow/shared';
import { analyzeReadings, CsvParseError, parseSensorCsv } from './sensor.js';

describe('parseSensorCsv', () => {
  it('parses a normal CSV with header', () => {
    const csv = `timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,start
2026-05-19T10:00:00Z,120,100,ramp faster than plan`;
    const r = parseSensorCsv(csv);
    expect(r).toHaveLength(2);
    expect(r[0].tempC).toBe(24);
    expect(r[1].note).toBe('ramp faster than plan');
  });

  it('rejects invalid timestamp', () => {
    expect(() => parseSensorCsv('timestamp,tempC,targetTempC,note\nnot-a-date,1,1,x')).toThrow(
      CsvParseError,
    );
  });

  it('rejects invalid tempC', () => {
    expect(() =>
      parseSensorCsv('timestamp,tempC,targetTempC,note\n2026-05-19T09:00:00Z,abc,1,x'),
    ).toThrow(CsvParseError);
  });

  it('rejects unclosed quoted cells', () => {
    expect(() =>
      parseSensorCsv('timestamp,tempC,targetTempC,note\n2026-05-19T09:00:00Z,100,100,"door opened'),
    ).toThrow(CsvParseError);
  });

  it('returns [] for empty CSV', () => {
    expect(parseSensorCsv('')).toEqual([]);
  });
});

function reading(overrides: Partial<SensorReading>): SensorReading {
  return {
    id: 'r-' + Math.random().toString(36).slice(2, 8),
    loadId: 'load-1',
    timestamp: new Date().toISOString(),
    tempC: 100,
    targetTempC: 100,
    note: '',
    ...overrides,
  };
}

describe('analyzeReadings', () => {
  it('flags large temperature deviation (>=50)', () => {
    const r = reading({ tempC: 200, targetTempC: 100 });
    const alerts = analyzeReadings({
      existingReadings: [],
      newReadings: [r],
      loadStatus: 'firing',
    });
    expect(alerts.find((a) => a.code === 'TEMP_DEVIATION')).toBeTruthy();
  });

  it('does not flag deviation when within threshold', () => {
    const r = reading({ tempC: 110, targetTempC: 100 });
    const alerts = analyzeReadings({
      existingReadings: [],
      newReadings: [r],
      loadStatus: 'firing',
    });
    expect(alerts.find((a) => a.code === 'TEMP_DEVIATION')).toBeFalsy();
  });

  it('flags excessive ramp rate', () => {
    const prev = reading({
      id: 'prev',
      timestamp: '2026-05-19T09:00:00Z',
      tempC: 24,
      targetTempC: 24,
    });
    const next = reading({
      id: 'next',
      timestamp: '2026-05-19T09:30:00Z',
      tempC: 200,
      targetTempC: 100,
    });
    const alerts = analyzeReadings({
      existingReadings: [prev],
      newReadings: [next],
      loadStatus: 'firing',
    });
    expect(alerts.find((a) => a.code === 'RAMP_TOO_FAST')).toBeTruthy();
  });

  it('flags unexpected cooldown while firing', () => {
    const prev = reading({
      id: 'prev',
      timestamp: '2026-05-19T09:00:00Z',
      tempC: 800,
      targetTempC: 800,
    });
    const next = reading({
      id: 'next',
      timestamp: '2026-05-19T09:30:00Z',
      tempC: 400,
      targetTempC: 800,
    });
    const alerts = analyzeReadings({
      existingReadings: [prev],
      newReadings: [next],
      loadStatus: 'firing',
    });
    expect(alerts.find((a) => a.code === 'UNEXPECTED_COOLDOWN')).toBeTruthy();
  });

  it('does not flag cooldown when load is not firing', () => {
    const prev = reading({
      id: 'prev',
      timestamp: '2026-05-19T09:00:00Z',
      tempC: 800,
      targetTempC: 0,
    });
    const next = reading({
      id: 'next',
      timestamp: '2026-05-19T09:30:00Z',
      tempC: 400,
      targetTempC: 0,
    });
    const alerts = analyzeReadings({
      existingReadings: [prev],
      newReadings: [next],
      loadStatus: 'completed',
    });
    expect(alerts.find((a) => a.code === 'UNEXPECTED_COOLDOWN')).toBeFalsy();
  });
});
