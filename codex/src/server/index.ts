import { createApp } from "./app.js";
import { seedDatabase } from "./db/seed.js";
import { migrate, openDatabase } from "./db/sqlite.js";

const port = parsePort(process.env.PORT);
const db = openDatabase();
migrate(db);
seedDatabase(db);

const app = createApp(db);
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`KilnFlow Ops API listening on http://127.0.0.1:${port}`);
});

server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 15_000;

let isShuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}, draining...`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timeout, exiting forcefully.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close((closeError) => {
    if (closeError) console.error("HTTP server close error:", closeError);
    try {
      db.close();
    } catch (dbError) {
      console.error("Database close error:", dbError);
    }
    clearTimeout(forceExit);
    process.exit(closeError ? 1 : 0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("SIGTERM");
});

function parsePort(raw: string | undefined): number {
  const fallback = 4000;
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    console.warn(`Invalid PORT="${raw}", falling back to ${fallback}.`);
    return fallback;
  }
  return value;
}
