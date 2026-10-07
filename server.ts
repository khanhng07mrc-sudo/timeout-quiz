import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketServer } from "./src/lib/socket-server";
import { registerSocketHandlers } from "./src/lib/socket-handlers";
import { cleanupStaleRooms } from "./src/lib/room-cleanup";
import { prisma } from "./src/lib/prisma";

async function ensureDatabaseSchema() {
  try {
    const modes = [
      "CLASSIC", "BUZZ", "BOUNCEBACK", "ELIMINATION", "TOURNAMENT",
      "GRID_CARO", "DICE_RACE", "WAGER", "MYSTERY_QUEST"
    ];
    for (const m of modes) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "GameMode" ADD VALUE IF NOT EXISTS '${m}'`).catch(() => {});
    }
    console.log("[DB] GameMode enum verified/synchronized with database.");
  } catch (err) {
    console.warn("[DB] Note on enum sync:", err);
  }
}

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await ensureDatabaseSchema();
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = initSocketServer(httpServer);
  registerSocketHandlers(io);

  // Periodic room garbage collection every 15 minutes
  const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
  setTimeout(() => {
    cleanupStaleRooms()
      .then((res) => {
        if (res.deletedCount > 0) {
          console.log(`[Room Cleanup] Initial boot cleanup purged ${res.deletedCount} stale room(s).`);
        }
      })
      .catch((err) => console.error("[Room Cleanup] Initial error:", err));

    setInterval(() => {
      cleanupStaleRooms()
        .then((res) => {
          if (res.deletedCount > 0) {
            console.log(`[Room Cleanup] Periodic cleanup purged ${res.deletedCount} stale room(s).`);
          }
        })
        .catch((err) => console.error("[Room Cleanup] Periodic error:", err));
    }, CLEANUP_INTERVAL_MS);
  }, 10000);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server initialized`);
  });
});
