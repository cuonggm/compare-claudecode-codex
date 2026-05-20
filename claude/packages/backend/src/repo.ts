// Thin data access layer wrapping prepared statements.
// All SQL goes through parameterized queries.

import type {
  Alert,
  Kiln,
  KilnLoad,
  LoadNote,
  Piece,
  PlannerResult,
  SensorReading,
  User,
} from '@kilnflow/shared';
import type { DB } from './db.js';

interface LoadRow {
  id: string;
  kilnId: string;
  targetCone: string;
  firingType: string;
  status: string;
  version: number;
  scheduledAt: string | null;
  planJson: string;
  createdAt: string;
  updatedAt: string;
}

function rowToLoad(row: LoadRow, notes: LoadNote[]): KilnLoad {
  return {
    id: row.id,
    kilnId: row.kilnId,
    targetCone: row.targetCone as KilnLoad['targetCone'],
    firingType: row.firingType as KilnLoad['firingType'],
    status: row.status as KilnLoad['status'],
    version: row.version,
    scheduledAt: row.scheduledAt,
    plan: JSON.parse(row.planJson) as PlannerResult,
    notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class Repo {
  constructor(private db: DB) {}

  // Users
  listUsers(): User[] {
    return this.db.prepare('SELECT * FROM users ORDER BY role, name').all() as User[];
  }
  getUser(id: string): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }
  insertUser(u: User) {
    this.db
      .prepare('INSERT INTO users (id, name, role) VALUES (?, ?, ?)')
      .run(u.id, u.name, u.role);
  }

  // Kilns
  listKilns(): Kiln[] {
    return this.db.prepare('SELECT * FROM kilns ORDER BY name').all() as Kiln[];
  }
  getKiln(id: string): Kiln | undefined {
    return this.db.prepare('SELECT * FROM kilns WHERE id = ?').get(id) as Kiln | undefined;
  }
  insertKiln(k: Kiln) {
    this.db
      .prepare(
        `INSERT INTO kilns (id, name, shelfWidthCm, shelfDepthCm, shelves, maxWeightKg, maxHeightPerShelfCm)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(k.id, k.name, k.shelfWidthCm, k.shelfDepthCm, k.shelves, k.maxWeightKg, k.maxHeightPerShelfCm);
  }

  // Pieces
  listPieces(filter?: {
    ownerId?: string;
    cone?: string;
    firingType?: string;
    status?: string;
    blockedReason?: string;
    dueBefore?: string;
  }): Piece[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter?.ownerId) {
      where.push('ownerId = ?');
      params.push(filter.ownerId);
    }
    if (filter?.cone) {
      where.push('targetCone = ?');
      params.push(filter.cone);
    }
    if (filter?.firingType) {
      where.push('firingType = ?');
      params.push(filter.firingType);
    }
    if (filter?.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.dueBefore) {
      where.push('dueDate <= ?');
      params.push(filter.dueBefore);
    }
    const sql = `SELECT * FROM pieces ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY dueDate ASC, name ASC`;
    return this.db.prepare(sql).all(...params) as Piece[];
  }
  getPiece(id: string): Piece | undefined {
    return this.db.prepare('SELECT * FROM pieces WHERE id = ?').get(id) as Piece | undefined;
  }
  insertPiece(p: Piece) {
    this.db
      .prepare(
        `INSERT INTO pieces
         (id, ownerId, name, clayBody, glazeFamily, targetCone, firingType,
          widthCm, depthCm, heightCm, weightKg, drynessPercent, dueDate, notes,
          status, createdAt, updatedAt)
         VALUES (@id, @ownerId, @name, @clayBody, @glazeFamily, @targetCone, @firingType,
                 @widthCm, @depthCm, @heightCm, @weightKg, @drynessPercent, @dueDate, @notes,
                 @status, @createdAt, @updatedAt)`,
      )
      .run(p);
  }
  updatePiece(p: Piece) {
    this.db
      .prepare(
        `UPDATE pieces SET
            ownerId=@ownerId, name=@name, clayBody=@clayBody, glazeFamily=@glazeFamily,
            targetCone=@targetCone, firingType=@firingType, widthCm=@widthCm,
            depthCm=@depthCm, heightCm=@heightCm, weightKg=@weightKg,
            drynessPercent=@drynessPercent, dueDate=@dueDate, notes=@notes,
            status=@status, updatedAt=@updatedAt
          WHERE id=@id`,
      )
      .run(p);
  }
  deletePiece(id: string) {
    this.db.prepare('DELETE FROM pieces WHERE id = ?').run(id);
  }
  updatePieceStatus(id: string, status: string, updatedAt: string) {
    this.db
      .prepare('UPDATE pieces SET status = ?, updatedAt = ? WHERE id = ?')
      .run(status, updatedAt, id);
  }

  // Loads
  listLoads(): KilnLoad[] {
    const rows = this.db
      .prepare('SELECT * FROM kiln_loads ORDER BY datetime(scheduledAt) ASC, createdAt DESC')
      .all() as LoadRow[];
    return rows.map((r) => rowToLoad(r, this.listLoadNotes(r.id)));
  }
  getLoad(id: string): KilnLoad | undefined {
    const row = this.db.prepare('SELECT * FROM kiln_loads WHERE id = ?').get(id) as
      | LoadRow
      | undefined;
    if (!row) return undefined;
    return rowToLoad(row, this.listLoadNotes(id));
  }
  insertLoad(l: KilnLoad) {
    this.db
      .prepare(
        `INSERT INTO kiln_loads (id, kilnId, targetCone, firingType, status, version, scheduledAt, planJson, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        l.id,
        l.kilnId,
        l.targetCone,
        l.firingType,
        l.status,
        l.version,
        l.scheduledAt,
        JSON.stringify(l.plan),
        l.createdAt,
        l.updatedAt,
      );
  }
  /**
   * Optimistic update. Returns the updated load or null if version mismatch.
   */
  updateLoadWithVersionCheck(
    id: string,
    expectedVersion: number,
    patch: {
      status?: string;
      scheduledAt?: string | null;
      plan?: PlannerResult;
      updatedAt: string;
    },
  ): KilnLoad | { conflict: true; current: KilnLoad | undefined } {
    const current = this.getLoad(id);
    if (!current) return { conflict: true, current: undefined };
    if (current.version !== expectedVersion) {
      return { conflict: true, current };
    }
    const newVersion = current.version + 1;
    this.db
      .prepare(
        `UPDATE kiln_loads SET
           status = COALESCE(?, status),
           scheduledAt = CASE WHEN ?=1 THEN ? ELSE scheduledAt END,
           planJson = COALESCE(?, planJson),
           updatedAt = ?,
           version = ?
         WHERE id = ? AND version = ?`,
      )
      .run(
        patch.status ?? null,
        patch.scheduledAt === undefined ? 0 : 1,
        patch.scheduledAt ?? null,
        patch.plan ? JSON.stringify(patch.plan) : null,
        patch.updatedAt,
        newVersion,
        id,
        expectedVersion,
      );
    return this.getLoad(id)!;
  }

  // Notes
  listLoadNotes(loadId: string): LoadNote[] {
    return this.db
      .prepare('SELECT * FROM load_notes WHERE loadId = ? ORDER BY createdAt ASC')
      .all(loadId) as LoadNote[];
  }
  insertLoadNote(n: LoadNote) {
    this.db
      .prepare(
        `INSERT INTO load_notes (id, loadId, authorId, authorName, authorRole, body, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(n.id, n.loadId, n.authorId, n.authorName, n.authorRole, n.body, n.createdAt);
  }

  // Sensor readings
  listSensorReadings(loadId: string): SensorReading[] {
    return this.db
      .prepare('SELECT * FROM sensor_readings WHERE loadId = ? ORDER BY timestamp ASC')
      .all(loadId) as SensorReading[];
  }
  insertSensorReadings(readings: SensorReading[]) {
    const stmt = this.db.prepare(
      `INSERT INTO sensor_readings (id, loadId, timestamp, tempC, targetTempC, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const txn = this.db.transaction((rs: SensorReading[]) => {
      for (const r of rs) {
        stmt.run(r.id, r.loadId, r.timestamp, r.tempC, r.targetTempC, r.note);
      }
    });
    txn(readings);
  }

  // Alerts
  listAlerts(loadId?: string, limit = 50): Alert[] {
    if (loadId) {
      return this.db
        .prepare('SELECT * FROM alerts WHERE loadId = ? ORDER BY createdAt DESC LIMIT ?')
        .all(loadId, limit) as Alert[];
    }
    return this.db
      .prepare('SELECT * FROM alerts ORDER BY createdAt DESC LIMIT ?')
      .all(limit) as Alert[];
  }
  insertAlerts(alerts: Alert[]) {
    const stmt = this.db.prepare(
      `INSERT INTO alerts (id, loadId, severity, code, message, createdAt, acknowledged)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const txn = this.db.transaction((items: Alert[]) => {
      for (const a of items) {
        stmt.run(a.id, a.loadId, a.severity, a.code, a.message, a.createdAt, a.acknowledged);
      }
    });
    txn(alerts);
  }

  // Aggregates for dashboard
  countPiecesByStatus(): Record<string, number> {
    const rows = this.db
      .prepare('SELECT status, COUNT(*) AS c FROM pieces GROUP BY status')
      .all() as Array<{ status: string; c: number }>;
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = r.c;
    return out;
  }
}
