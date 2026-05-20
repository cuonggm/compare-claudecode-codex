import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (path: string) => DatabaseSyncType;
};

export type Db = DatabaseSyncType;

export function getDefaultDatabasePath(): string {
  return resolve(process.env.DATABASE_PATH ?? "./data/kilnflow.sqlite");
}

export function openDatabase(databasePath = getDefaultDatabasePath()): Db {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('member', 'technician', 'manager', 'observer'))
    );

    CREATE TABLE IF NOT EXISTS kilns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      shelf_width_cm REAL NOT NULL,
      shelf_depth_cm REAL NOT NULL,
      shelf_count INTEGER NOT NULL,
      max_weight_kg REAL NOT NULL,
      max_height_per_shelf_cm REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pieces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      clay_body TEXT NOT NULL,
      glaze_family TEXT NOT NULL,
      target_cone TEXT NOT NULL,
      firing_type TEXT NOT NULL,
      width_cm REAL NOT NULL,
      depth_cm REAL NOT NULL,
      height_cm REAL NOT NULL,
      weight_kg REAL NOT NULL,
      dryness_percent REAL NOT NULL,
      due_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kiln_id INTEGER NOT NULL REFERENCES kilns(id),
      target_cone TEXT NOT NULL,
      firing_type TEXT NOT NULL,
      status TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      scheduled_start TEXT,
      scheduled_end TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS load_pieces (
      load_id INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
      piece_id INTEGER NOT NULL REFERENCES pieces(id),
      shelf_index INTEGER NOT NULL,
      x_cm REAL NOT NULL,
      y_cm REAL NOT NULL,
      width_cm REAL NOT NULL,
      depth_cm REAL NOT NULL,
      PRIMARY KEY (load_id, piece_id)
    );

    CREATE TABLE IF NOT EXISTS load_exclusions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_id INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
      piece_id INTEGER NOT NULL REFERENCES pieces(id),
      reason_code TEXT NOT NULL,
      reason_message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_id INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_id INTEGER NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      temp_c REAL NOT NULL,
      target_temp_c REAL NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_id INTEGER REFERENCES loads(id) ON DELETE CASCADE,
      piece_id INTEGER REFERENCES pieces(id),
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pieces_owner ON pieces(owner_id);
    CREATE INDEX IF NOT EXISTS idx_pieces_status ON pieces(status);
    CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_sensor_load_timestamp ON sensor_readings(load_id, timestamp);
  `);
}

export function nowIso(): string {
  return new Date().toISOString();
}
