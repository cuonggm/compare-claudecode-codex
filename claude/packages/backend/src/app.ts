import cors from 'cors';
import express, { type Express } from 'express';
import { authMiddleware } from './auth.js';
import { config } from './config.js';
import { Repo } from './repo.js';
import { createRoutes } from './routes.js';
import type { DB } from './db.js';

export function buildApp(db: DB): Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(
    cors({
      origin: config.corsOrigin,
      allowedHeaders: ['Content-Type', 'X-User-Id'],
    }),
  );
  const repo = new Repo(db);
  app.use(authMiddleware(repo));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', createRoutes(repo));
  return app;
}
