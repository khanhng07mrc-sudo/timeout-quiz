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
      "GRID_CARO", "DICE_RACE", "WAGER", "MYSTERY_QUEST", "MAGIC_WHEEL"
    ];
    for (const m of modes) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "GameMode" ADD VALUE IF NOT EXISTS '${m}'`).catch(() => {});
    }
    const qTypes = ["CLOZE_DROPDOWN", "WORD_PUZZLE", "MATCHING", "DRAG_DROP"];
    for (const qt of qTypes) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS '${qt}'`).catch(() => {});
    }
    await prisma.$executeRawUnsafe(`ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "mediaPlaybackMode" TEXT DEFAULT 'AFTER_PLAY'`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "allowManualGrading" BOOLEAN DEFAULT false`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "gradingCriteria" TEXT`).catch(() => {});
    console.log("[DB] GameMode and Question schema verified/synchronized with database.");
  } catch (err) {
    console.warn("[DB] Note on schema sync:", err);
  }
}

// Global process safety handlers: Prevent unexpected async errors from crashing the Node.js server
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process Safety] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Process Safety] Uncaught Exception:", error);
});

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
