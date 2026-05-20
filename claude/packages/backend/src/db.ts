import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

export type DB = Database.Database;

let dbInstance: DB | null = null;

export function getDb(): DB {
  if (dbInstance) return dbInstance;
  const dir = path.dirname(config.databaseFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  dbInstance = new Database(config.databaseFile);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  migrate(dbInstance);
  return dbInstance;
}

export function setDb(db: DB) {
  dbInstance = db;
  db.pragma('foreign_keys = ON');
  migrate(db);
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function openInMemoryDb(): DB {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: DB) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('member','technician','manager','observer'))
    );

    CREATE TABLE IF NOT EXISTS kilns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shelfWidthCm REAL NOT NULL,
      shelfDepthCm REAL NOT NULL,
      shelves INTEGER NOT NULL,
      maxWeightKg REAL NOT NULL,
      maxHeightPerShelfCm REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pieces (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      clayBody TEXT NOT NULL,
      glazeFamily TEXT NOT NULL,
      targetCone TEXT NOT NULL,
      firingType TEXT NOT NULL,
      widthCm REAL NOT NULL,
      depthCm REAL NOT NULL,
      heightCm REAL NOT NULL,
      weightKg REAL NOT NULL,
      drynessPercent REAL NOT NULL,
      dueDate TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ready',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kiln_loads (
      id TEXT PRIMARY KEY,
      kilnId TEXT NOT NULL REFERENCES kilns(id),
      targetCone TEXT NOT NULL,
      firingType TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      scheduledAt TEXT,
      planJson TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS load_notes (
      id TEXT PRIMARY KEY,
      loadId TEXT NOT NULL REFERENCES kiln_loads(id) ON DELETE CASCADE,
      authorId TEXT NOT NULL REFERENCES users(id),
      authorName TEXT NOT NULL,
      authorRole TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id TEXT PRIMARY KEY,
      loadId TEXT NOT NULL REFERENCES kiln_loads(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      tempC REAL NOT NULL,
      targetTempC REAL NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_sensor_load_time
      ON sensor_readings (loadId, timestamp);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      loadId TEXT NOT NULL REFERENCES kiln_loads(id) ON DELETE CASCADE,
      severity TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_load ON alerts (loadId);
  `);
}
