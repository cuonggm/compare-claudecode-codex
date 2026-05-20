import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// packages/backend is the root for all relative file paths.
const packageRoot = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseFile: process.env.DATABASE_FILE
    ? path.resolve(packageRoot, process.env.DATABASE_FILE)
    : path.resolve(packageRoot, 'data', 'kilnflow.sqlite'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
