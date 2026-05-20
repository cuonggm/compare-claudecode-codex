import { createApp } from "./app.js";
import { seedDatabase } from "./db/seed.js";
import { migrate, openDatabase } from "./db/sqlite.js";

const port = Number(process.env.PORT ?? 4000);
const db = openDatabase();
migrate(db);
seedDatabase(db);

const app = createApp(db);

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`KilnFlow Ops API listening on http://127.0.0.1:${port}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    db.close();
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
