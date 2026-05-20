import { buildApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db.js';
import { ensureSeeded } from './seed.js';

const db = getDb();
ensureSeeded(db);
const app = buildApp(db);

const server = app.listen(config.port, () => {
  console.log(`[kilnflow] backend listening on http://localhost:${config.port}`);
});

function shutdown(signal: string) {
  console.log(`[kilnflow] received ${signal}, shutting down`);
  server.close(() => {
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
