import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// packages/backend is the root for all relative file paths.
const packageRoot = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseFile: process.env.DATABASE_FILE
    ? path.resolve(packageRoot, process.env.DATABASE_FILE)
    : path.resolve(packageRoot, 'data', 'kilnflow.sqlite'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rateLimitWindowMs: readPositiveInt('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitMaxWrites: readPositiveInt('RATE_LIMIT_MAX_WRITES', 120),
};
