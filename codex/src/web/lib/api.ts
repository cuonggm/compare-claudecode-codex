import type { Alert, FiringType, Kiln, Load, Piece, Role, SensorReading, TargetCone, User } from "../../shared/domain";
import type { PlannerResult } from "../../shared/planner";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type LoadDetail = {
  load: Load;
  kiln: Kiln;
  selectedPieces: Array<Piece & { shelfIndex: number; xCm: number; yCm: number; placedWidthCm: number; placedDepthCm: number }>;
  excludedPieces: Array<{ pieceId: number; pieceName: string; ownerName?: string; reasonCode: string; message: string }>;
  auditNotes: Array<{ id: number; userId: number; userName: string; note: string; createdAt: string }>;
  sensorReadings: SensorReading[];
  alerts: Alert[];
};

export type DashboardSummary = {
  pendingPieces: number;
  readyPieces: number;
  blockedPieces: number;
  blockedReasonCounts: Array<{ code: string; message: string; count: number }>;
  upcomingLoads: Load[];
  recentAlerts: Alert[];
  kilnCapacity: Array<{ kiln: Kiln; activeLoads: number; scheduledLoads: number; maxWeightKg: number; shelfAreaCm2: number }>;
};

export type PieceInput = {
  ownerId: number;
  name: string;
  clayBody: string;
  glazeFamily: string;
  targetCone: string;
  firingType: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  weightKg: number;
  drynessPercent: number;
  dueDate: string;
  notes: string;
};

export type ApiError = Error & {
  status?: number;
  code?: string;
};

export function canManageLoads(role: Role): boolean {
  return role === "technician" || role === "manager";
}

export function canManageSchedule(role: Role): boolean {
  return role === "manager";
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function apiRequest<T>(path: string, userId: number, init: RequestInit = {}): Promise<T> {
  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error("Thiếu hoặc sai mã người dùng.") as ApiError;
    error.code = "INVALID_USER";
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-user-id": String(userId),
        ...init.headers
      }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({} as Record<string, unknown>));
      const message = typeof body.message === "string" ? body.message : `Request failed with ${response.status}`;
      const error = new Error(message) as ApiError;
      error.status = response.status;
      error.code = typeof body.code === "string" ? body.code : undefined;
      throw error;
    }

    return (await response.json()) as T;
  } catch (rawError) {
    if (rawError instanceof DOMException && rawError.name === "AbortError") {
      const error = new Error("Hết thời gian chờ phản hồi từ máy chủ.") as ApiError;
      error.code = "TIMEOUT";
      throw error;
    }
    throw rawError;
  } finally {
    clearTimeout(timeout);
  }
}

export const Api = {
  users(userId: number) {
    return apiRequest<{ users: User[] }>("/api/users", userId);
  },
  dashboard(userId: number) {
    return apiRequest<DashboardSummary>("/api/dashboard", userId);
  },
  kilns(userId: number) {
    return apiRequest<{ kilns: Kiln[] }>("/api/kilns", userId);
  },
  pieces(userId: number, params: Record<string, string>) {
    const query = new URLSearchParams(params);
    return apiRequest<{ pieces: Piece[] }>(`/api/pieces?${query.toString()}`, userId);
  },
  createPiece(userId: number, input: PieceInput) {
    return apiRequest<{ piece: Piece }>("/api/pieces", userId, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  loads(userId: number) {
    return apiRequest<{ loads: Load[] }>("/api/loads", userId);
  },
  loadDetail(userId: number, loadId: number) {
    return apiRequest<LoadDetail>(`/api/loads/${loadId}`, userId);
  },
  planLoad(userId: number, input: { kilnId: number; targetCone: TargetCone; firingType: FiringType; dueDatePriority: boolean }) {
    return apiRequest<{ load: Load; plan: PlannerResult; detail: LoadDetail }>("/api/loads/plan", userId, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  regenerate(userId: number, loadId: number, expectedVersion: number) {
    return apiRequest<{ detail: LoadDetail; plan: PlannerResult }>(`/api/loads/${loadId}/regenerate`, userId, {
      method: "POST",
      body: JSON.stringify({ expectedVersion })
    });
  },
  addNote(userId: number, loadId: number, expectedVersion: number, note: string) {
    return apiRequest<{ detail: LoadDetail }>(`/api/loads/${loadId}/notes`, userId, {
      method: "POST",
      body: JSON.stringify({ expectedVersion, note })
    });
  },
  approve(userId: number, loadId: number, expectedVersion: number) {
    return apiRequest<{ detail: LoadDetail }>(`/api/loads/${loadId}/approve`, userId, {
      method: "POST",
      body: JSON.stringify({ expectedVersion })
    });
  },
  schedule(userId: number, loadId: number, input: { expectedVersion: number; scheduledStart: string; scheduledEnd: string }) {
    return apiRequest<{ detail: LoadDetail }>(`/api/loads/${loadId}/schedule`, userId, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  cancel(userId: number, loadId: number, expectedVersion: number) {
    return apiRequest<{ detail: LoadDetail }>(`/api/loads/${loadId}/cancel`, userId, {
      method: "POST",
      body: JSON.stringify({ expectedVersion })
    });
  },
  importCsv(userId: number, loadId: number, csv: string) {
    return apiRequest<{ readings: SensorReading[]; alerts: Alert[] }>(`/api/loads/${loadId}/sensor-csv`, userId, {
      method: "POST",
      body: JSON.stringify({ csv })
    });
  }
};
