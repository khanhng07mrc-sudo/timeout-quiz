import { prisma } from "./prisma";

export interface CleanupOptions {
  finishedMaxAgeHours?: number; // default: 2 hours (phòng đã kết thúc quá 2h)
  sandboxMaxAgeHours?: number;  // default: 1 hour (phòng test sandbox quá 1h)
  lobbyMaxAgeHours?: number;    // default: 6 hours (phòng tạo ra nhưng không ai chơi quá 6h)
  playingMaxAgeHours?: number;  // default: 12 hours (phòng treo dở dang không tương tác quá 12h)
  emptyMaxAgeHours?: number;    // default: 2 hours (phòng 0 người chơi tạo quá 2h)
  forceAllFinished?: boolean;   // xóa tất cả phòng đã kết thúc không kể thời gian
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

  const [finishedCount, sandboxCount, staleLobbyCount, stalePlayingCount, emptyCount] = await Promise.all([
    prisma.room.count({
      where: {
        status: "FINISHED",
        OR: [
          { endedAt: { lte: finishedCutoff } },
          { updatedAt: { lte: finishedCutoff } },
        ],
      },
    }),
    prisma.room.count({
      where: {
        name: { startsWith: "[Sandbox]" },
        createdAt: { lte: sandboxCutoff },
      },
    }),
    prisma.room.count({
      where: {
        status: "LOBBY",
        createdAt: { lte: lobbyCutoff },
      },
    }),
    prisma.room.count({
      where: {
        status: { in: ["PLAYING", "PAUSED"] },
        updatedAt: { lte: playingCutoff },
      },
    }),
    prisma.room.count({
      where: {
        players: { none: {} },
        createdAt: { lte: emptyCutoff },
      },
    }),
  ]);

  const allStaleRooms = await prisma.room.findMany({
    where: {
      OR: [
        {
          status: "FINISHED",
          OR: [
            { endedAt: { lte: finishedCutoff } },
            { updatedAt: { lte: finishedCutoff } },
          ],
        },
        {
          name: { startsWith: "[Sandbox]" },
          createdAt: { lte: sandboxCutoff },
        },
        {
          status: "LOBBY",
          createdAt: { lte: lobbyCutoff },
        },
        {
          status: { in: ["PLAYING", "PAUSED"] },
          updatedAt: { lte: playingCutoff },
        },
        {
          players: { none: {} },
          createdAt: { lte: emptyCutoff },
        },
      ],
    },
    select: { id: true },
  });

  return {
    finishedCount,
    sandboxCount,
    staleLobbyCount,
    stalePlayingCount,
    emptyCount,
    totalStaleCount: allStaleRooms.length,
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

  const roomsDeleted: CleanupResult["roomsDeleted"] = [];

  for (const r of staleRooms) {
    try {
      // 1. Release in-memory timers and structures
      globalForSockets.cleanupRoomInMemory?.(r.id);

      // 2. Delete room from database (Prisma cascade handles relations)
      await prisma.room.delete({
        where: { id: r.id },
      });

      roomsDeleted.push(r);
    } catch (err) {
      console.error(`[room-cleanup] Failed to delete room ${r.code} (${r.id}):`, err);
    }
  }

  return {
    deletedCount: roomsDeleted.length,
    roomsDeleted,
  };
}
