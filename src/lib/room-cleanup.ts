import { prisma } from "./prisma";

export interface CleanupOptions {
  finishedMaxAgeHours?: number; // default: 2 hours (phòng đã kết thúc quá 2h)
  sandboxMaxAgeHours?: number;  // default: 1 hour (phòng test sandbox quá 1h)
  lobbyMaxAgeHours?: number;    // default: 6 hours (phòng tạo ra nhưng không ai chơi quá 6h)
  playingMaxAgeHours?: number;  // default: 12 hours (phòng treo dở dang không tương tác quá 12h)
  emptyMaxAgeHours?: number;    // default: 2 hours (phòng 0 người chơi tạo quá 2h)
  forceAllFinished?: boolean;   // xóa tất cả phòng đã kết thúc không kể thời gian
  forceAllSandbox?: boolean;    // xóa tất cả phòng test sandbox không kể thời gian
}

export interface CleanupResult {
  deletedCount: number;
  roomsDeleted: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    createdAt: Date;
    endedAt: Date | null;
  }>;
}

export interface StaleRoomsStats {
  finishedCount: number;
  sandboxCount: number;
  allSandboxCount: number;
  staleLobbyCount: number;
  stalePlayingCount: number;
  emptyCount: number;
  totalStaleCount: number;
}

/**
 * Tính toán thống kê các phòng cũ / bỏ rơi đang tồn tại trong hệ thống
 */
export async function getStaleRoomsStats(options: CleanupOptions = {}): Promise<StaleRoomsStats> {
  const {
    finishedMaxAgeHours = 2,
    sandboxMaxAgeHours = 1,
    lobbyMaxAgeHours = 6,
    playingMaxAgeHours = 12,
    emptyMaxAgeHours = 2,
  } = options;

  const now = new Date();
  const finishedCutoff = new Date(now.getTime() - finishedMaxAgeHours * 60 * 60 * 1000);
  const sandboxCutoff = new Date(now.getTime() - sandboxMaxAgeHours * 60 * 60 * 1000);
  const lobbyCutoff = new Date(now.getTime() - lobbyMaxAgeHours * 60 * 60 * 1000);
  const playingCutoff = new Date(now.getTime() - playingMaxAgeHours * 60 * 60 * 1000);
  const emptyCutoff = new Date(now.getTime() - emptyMaxAgeHours * 60 * 60 * 1000);

  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      endedAt: true,
      _count: {
        select: { players: true },
      },
    },
  });

  let finishedCount = 0;
  let sandboxCount = 0;
  let allSandboxCount = 0;
  let staleLobbyCount = 0;
  let stalePlayingCount = 0;
  let emptyCount = 0;
  const staleRoomIds = new Set<string>();

  for (const r of rooms) {
    const isFinished = r.status === "FINISHED" && ((r.endedAt && r.endedAt <= finishedCutoff) || (r.updatedAt <= finishedCutoff));
    const isSandbox = r.name.startsWith("[Sandbox]") || r.code.startsWith("sb_");
    const isStaleSandbox = isSandbox && r.createdAt <= sandboxCutoff;
    const isStaleLobby = r.status === "LOBBY" && r.createdAt <= lobbyCutoff;
    const isStalePlaying = (r.status === "PLAYING" || r.status === "PAUSED") && r.updatedAt <= playingCutoff;
    const isEmpty = r._count.players === 0 && r.createdAt <= emptyCutoff;

    if (isFinished) { finishedCount++; staleRoomIds.add(r.id); }
    if (isSandbox) { allSandboxCount++; }
    if (isStaleSandbox) { sandboxCount++; staleRoomIds.add(r.id); }
    if (isStaleLobby) { staleLobbyCount++; staleRoomIds.add(r.id); }
    if (isStalePlaying) { stalePlayingCount++; staleRoomIds.add(r.id); }
    if (isEmpty) { emptyCount++; staleRoomIds.add(r.id); }
  }

  return {
    finishedCount,
    sandboxCount,
    allSandboxCount,
    staleLobbyCount,
    stalePlayingCount,
    emptyCount,
    totalStaleCount: staleRoomIds.size,
  };
}

/**
 * Quét và dọn dẹp các phòng tồn tại quá lâu / bị bỏ rơi:
 * 1. Phòng đã FINISHED quá 2 giờ (hoặc tất cả nếu forceAllFinished)
 * 2. Phòng test [Sandbox] quá 1 giờ
 * 3. Phòng LOBBY tạo ra nhưng bỏ quên quá 6 giờ
 * 4. Phòng PLAYING/PAUSED không có tương tác quá 12 giờ
 * 5. Phòng 0 người chơi tạo quá 2 giờ
 *
 * Đồng thời:
 * - Hủy toàn bộ timer đếm ngược, timer chuông, timer cược trong RAM.
 * - Xóa sạch cache và state trong bộ nhớ WebSocket.
 * - Xóa bản ghi trong Database (Cascade tự động xóa players, teams, answers, powerupCards, gameLogs).
 */
export async function cleanupStaleRooms(options: CleanupOptions = {}): Promise<CleanupResult> {
  const {
    finishedMaxAgeHours = 2,
    sandboxMaxAgeHours = 1,
    lobbyMaxAgeHours = 6,
    playingMaxAgeHours = 12,
    emptyMaxAgeHours = 2,
    forceAllFinished = false,
    forceAllSandbox = false,
  } = options;

  const now = new Date();
  const finishedCutoff = new Date(now.getTime() - finishedMaxAgeHours * 60 * 60 * 1000);
  const sandboxCutoff = new Date(now.getTime() - sandboxMaxAgeHours * 60 * 60 * 1000);
  const lobbyCutoff = new Date(now.getTime() - lobbyMaxAgeHours * 60 * 60 * 1000);
  const playingCutoff = new Date(now.getTime() - playingMaxAgeHours * 60 * 60 * 1000);
  const emptyCutoff = new Date(now.getTime() - emptyMaxAgeHours * 60 * 60 * 1000);

  const orConditions: any[] = [
    // 1. Finished rooms older than cutoff
    {
      status: "FINISHED",
      OR: [
        { endedAt: { lte: finishedCutoff } },
        { updatedAt: { lte: finishedCutoff } },
      ],
    },
    // 2. Sandbox rooms older than cutoff
    {
      name: { startsWith: "[Sandbox]" },
      createdAt: { lte: sandboxCutoff },
    },
    // 3. Stale unplayed lobbies
    {
      status: "LOBBY",
      createdAt: { lte: lobbyCutoff },
    },
    // 4. Stale abandoned games
    {
      status: { in: ["PLAYING", "PAUSED"] },
      updatedAt: { lte: playingCutoff },
    },
    // 5. Empty rooms with 0 players
    {
      players: { none: {} },
      createdAt: { lte: emptyCutoff },
    },
  ];

  if (forceAllFinished) {
    orConditions.push({ status: "FINISHED" });
  }

  if (forceAllSandbox) {
    orConditions.push(
      { name: { startsWith: "[Sandbox]" } },
      { code: { startsWith: "sb_" } }
    );
  }

  const staleRooms = await prisma.room.findMany({
    where: {
      OR: orConditions,
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      createdAt: true,
      endedAt: true,
    },
  });

  if (staleRooms.length === 0) {
    return { deletedCount: 0, roomsDeleted: [] };
  }

  const globalForSockets = globalThis as unknown as {
    cleanupRoomInMemory?: (roomId: string) => void;
  };

  // 1. Release in-memory timers and structures
  for (const r of staleRooms) {
    globalForSockets.cleanupRoomInMemory?.(r.id);
  }

  // 2. Batch delete in strict foreign key order to prevent deadlocks and lock contention
  const ids = staleRooms.map((r) => r.id);
  try {
    await prisma.$transaction([
      prisma.gameLog.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.answer.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.powerupCard.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.player.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.team.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.room.deleteMany({ where: { id: { in: ids } } }),
    ]);
  } catch (batchErr) {
    console.error("[room-cleanup] Batch deletion error, falling back to safe individual delete:", batchErr);
    for (const r of staleRooms) {
      try {
        await prisma.gameLog.deleteMany({ where: { roomId: r.id } }).catch(() => {});
        await prisma.answer.deleteMany({ where: { roomId: r.id } }).catch(() => {});
        await prisma.powerupCard.deleteMany({ where: { roomId: r.id } }).catch(() => {});
        await prisma.player.deleteMany({ where: { roomId: r.id } }).catch(() => {});
        await prisma.team.deleteMany({ where: { roomId: r.id } }).catch(() => {});
        await prisma.room.delete({ where: { id: r.id } }).catch(() => {});
      } catch {}
    }
  }

  return {
    deletedCount: staleRooms.length,
    roomsDeleted: staleRooms,
  };
}
