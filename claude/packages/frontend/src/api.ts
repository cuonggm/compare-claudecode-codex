// Lightweight fetch wrapper. The frontend sends X-User-Id from the mock auth
// state and surfaces server-side errors (including 409 Conflict).

import type {
  Alert,
  DashboardSummary,
  Kiln,
  KilnLoad,
  LoadNote,
  Piece,
  PlanRequest,
  PlannerResult,
  SensorReading,
  User,
} from '@kilnflow/shared';

const BASE = '/api';

let userIdProvider: () => string | null = () => null;
export function setUserIdProvider(fn: () => string | null) {
  userIdProvider = fn;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userId = userIdProvider();
  if (userId) headers['X-User-Id'] = userId;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!res.ok) {
    let errMsg = `Yêu cầu thất bại (mã ${res.status}).`;
    if (payload && typeof payload === 'object') {
      const maybe = (payload as { error?: string }).error;
      if (typeof maybe === 'string' && maybe.length > 0) errMsg = maybe;
    }
    throw new ApiError(res.status, errMsg, payload);
  }
  return payload as T;
}

export const api = {
  listUsers: () => request<User[]>('GET', '/users'),
  me: () => request<User>('GET', '/me'),
  listKilns: () => request<Kiln[]>('GET', '/kilns'),
  listPieces: (filter?: Record<string, string | undefined>) => {
    const q = filter
      ? '?' +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(filter).filter(([, v]) => v !== undefined && v !== ''),
          ) as Record<string, string>,
        ).toString()
      : '';
    return request<Piece[]>('GET', '/pieces' + q);
  },
  getPiece: (id: string) => request<Piece>('GET', `/pieces/${id}`),
  createPiece: (data: Omit<Piece, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: string }) =>
    request<Piece>('POST', '/pieces', data),
  updatePiece: (id: string, data: Partial<Piece> & { ownerId: string; name: string }) =>
    request<Piece>('PUT', `/pieces/${id}`, data),
  deletePiece: (id: string) => request<void>('DELETE', `/pieces/${id}`),

  dashboard: () => request<DashboardSummary>('GET', '/dashboard'),

  listLoads: () => request<KilnLoad[]>('GET', '/loads'),
  getLoad: (id: string) => request<KilnLoad>('GET', `/loads/${id}`),
  previewPlan: (data: PlanRequest) => request<PlannerResult>('POST', '/loads/plan', data),
  createLoad: (data: PlanRequest) => request<KilnLoad>('POST', '/loads', data),
  regenerateLoad: (id: string, expectedVersion: number) =>
    request<KilnLoad>('POST', `/loads/${id}/regenerate`, { expectedVersion }),
  approveLoad: (id: string, expectedVersion: number) =>
    request<KilnLoad>('POST', `/loads/${id}/approve`, { expectedVersion }),
  scheduleLoad: (id: string, expectedVersion: number, scheduledAt: string) =>
    request<KilnLoad>('POST', `/loads/${id}/schedule`, { expectedVersion, scheduledAt }),
  cancelLoad: (id: string, expectedVersion: number) =>
    request<KilnLoad>('POST', `/loads/${id}/cancel`, { expectedVersion }),
  addNote: (id: string, body: string) =>
    request<LoadNote>('POST', `/loads/${id}/notes`, { body }),

  listSensorReadings: (id: string) =>
    request<SensorReading[]>('GET', `/loads/${id}/sensors`),
  listAlerts: (id: string) => request<Alert[]>('GET', `/loads/${id}/alerts`),
  importSensorCsv: (id: string, csv: string) =>
    request<{ readings: SensorReading[]; alerts: Alert[] }>(
      'POST',
      `/loads/${id}/sensors/import`,
      { csv },
    ),
};
