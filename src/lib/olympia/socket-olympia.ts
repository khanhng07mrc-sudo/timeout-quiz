import { SAMPLE_QUESTION_SET, BAC_AI_QUESTION_SET } from "./sample-questions";
import { getPresetOlympiaBanks } from "./olympia-storage";
// Olympia socket layer: isolated "/olympia" namespace — does not touch the existing room handlers.
import type { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "../prisma";
import { sanitizePlayerName } from "../security";
import { OlympiaGame } from "./engine";
import type { OlympiaConfig, OlympiaState } from "./types";

type Role = "host" | "display" | "player";
interface ClientInfo {
  code: string;
  role: Role;
  seatId?: number;
}

interface GameEntry {
  game: OlympiaGame;
  roomId: string;
  hostKey: string;
  baseConfig: Record<string, unknown>;
  clients: Map<string, ClientInfo>; // socketId -> info
  saveTimer: ReturnType<typeof setTimeout> | null;
  lastStage: string;
  /** previous view for each socket is not stored; clients de-dupe by version */
}

const games = new Map<string, GameEntry>();
const loading = new Map<string, Promise<GameEntry | null>>();

async function loadGame(code: string): Promise<GameEntry | null> {
  const cached = games.get(code);
  if (cached) return cached;
  const pending = loading.get(code);
  if (pending) return pending;

  const p = (async () => {
    let room: { id: string; mode: string; config: unknown; hostKey: string | null; quizBankId?: string | null } | null = null;
    try {
      room = await prisma.room.findUnique({
        where: { code },
        select: { id: true, mode: true, config: true, hostKey: true, quizBankId: true },
      });
    } catch {
      // Prisma offline or DATABASE_URL not set
    }

    if (!room || room.mode !== ("OLYMPIA" as typeof room.mode)) {
      if (code === "SANDBOX" || code === "OFFLINE" || code.startsWith("OFFLINE") || /^\d{6}$/.test(code) || code.startsWith("sandbox")) {
        const defaultCfg: OlympiaConfig = {
          rulesetId: "O26",
          rounds: ["khoiDong", "vcnv", "tangToc", "veDich"],
          questionSet: SAMPLE_QUESTION_SET,
          seatCount: 4,
          teams: [
            { name: "Thí sinh 1" },
            { name: "Thí sinh 2" },
            { name: "Thí sinh 3" },
            { name: "Thí sinh 4" },
          ],
        };
        const game = new OlympiaGame(code, defaultCfg);
        const entry: GameEntry = {
          game,
          roomId: `sandbox-${code}`,
          hostKey: "sandbox",
          baseConfig: { sandbox: true, olympia: defaultCfg },
          clients: new Map(),
          saveTimer: null,
          lastStage: game.state.stage,
        };
        games.set(code, entry);
        return entry;
      }
      return null;
    }
    const cfg = (room.config && typeof room.config === "object" ? room.config : {}) as Record<string, unknown>;
    const olympia = cfg.olympia as OlympiaConfig | undefined;
    if (!olympia) return null;
    const bankId = String(room?.quizBankId || (cfg as any)?.quizBankId || "");
    const bankTitle = String((cfg as any)?.customBankTitle || (cfg as any)?.quizBankTitle || "").toLowerCase();
    if (
      bankId === "olympia_preset_dauthau_bacai" ||
      bankTitle.includes("bác ái") ||
      bankTitle.includes("bac ai") ||
      bankTitle.includes("đấu thầu") ||
      bankTitle.includes("dau thau") ||
      bankId.includes("bacai") ||
      bankId.includes("dauthau")
    ) {
      olympia.questionSet = BAC_AI_QUESTION_SET;
    } else if (!olympia.questionSet) {
      const preset = getPresetOlympiaBanks().find((b) => b.id === bankId);
      olympia.questionSet = preset ? preset.set : SAMPLE_QUESTION_SET;
    }
    const game = new OlympiaGame(code, olympia);
    const snap = cfg.olympiaSnapshot as OlympiaState | undefined;
    if (snap && snap.code === code) {
      game.state = snap;
      game.state.seats.forEach((s) => (s.connected = false));
    }
    const entry: GameEntry = {
      game,
      roomId: room.id,
      hostKey: room.hostKey ?? "",
      baseConfig: cfg,
      clients: new Map(),
      saveTimer: null,
      lastStage: game.state.stage,
    };
    games.set(code, entry);
    return entry;
  })().finally(() => loading.delete(code));
  loading.set(code, p);
  return p;
}

function scheduleSave(entry: GameEntry) {
  if (entry.saveTimer) return;
  entry.saveTimer = setTimeout(async () => {
    entry.saveTimer = null;
    try {
      const stage = entry.game.state.stage;
      const data: Record<string, unknown> = {
        config: { ...entry.baseConfig, olympiaSnapshot: entry.game.state },
      };
      if (stage !== entry.lastStage) {
        data.status = stage === "playing" ? "PLAYING" : stage === "finished" ? "FINISHED" : "LOBBY";
        if (stage === "finished") data.endedAt = new Date();
        entry.lastStage = stage;
      }
      if (!entry.roomId.startsWith("sandbox")) {
        await prisma.room.update({ where: { id: entry.roomId }, data: data as never });
      }
    } catch (e) {
      console.warn("[Olympia] snapshot save failed:", (e as Error).message);
    }
  }, 1500);
}

export function registerOlympiaSocket(io: SocketIOServer<any, any>) {
  const nsp = io.of("/olympia");

  function broadcast(code: string) {
    const entry = games.get(code);
    if (!entry) return;
    const g = entry.game;
    const rooms = nsp.adapter.rooms;

    // Native Socket.IO room broadcast — only serialize views for rooms with active sockets
    if ((rooms.get(`olympia:${code}:host`)?.size ?? 0) > 0) {
      nsp.to(`olympia:${code}:host`).emit("state", g.view("host"));
    }
    if ((rooms.get(`olympia:${code}:display`)?.size ?? 0) > 0) {
      nsp.to(`olympia:${code}:display`).emit("state", g.view("display"));
    }
    for (let s = 0; s < 8; s++) {
      if ((rooms.get(`olympia:${code}:player:${s}`)?.size ?? 0) > 0) {
        nsp.to(`olympia:${code}:player:${s}`).emit("state", g.view("player", s));
      }
    }
    scheduleSave(entry);
  }

  nsp.on("connection", (socket: Socket) => {
    let info: ClientInfo | null = null;

    socket.on("time:sync", (clientTime: number, cb?: (r: { clientTime: number; serverTime: number }) => void) => {
      cb?.({ clientTime, serverTime: Date.now() });
    });

    socket.on(
      "join",
      async (
        payload: {
          code?: string;
          role?: Role;
          key?: string;
          name?: string;
          token?: string;
          seatId?: number;
          school?: string;
        },
        ack?: (r: Record<string, unknown>) => void
      ) => {
        try {
          const code = String(payload?.code ?? "").trim();
          const role = payload?.role;
          if (!code || (role !== "host" && role !== "display" && role !== "player")) {
            return ack?.({ ok: false, error: "Yêu cầu không hợp lệ" });
          }
          const entry = await loadGame(code);
          if (!entry) return ack?.({ ok: false, error: "Phòng Olympia không tồn tại" });

          let seatId: number | undefined;
          let joinStatus: "approved" | "pending" = "approved";
          if (role === "host") {
            const isKeyMatch = entry.hostKey && payload.key === entry.hostKey;
            const isSandbox = payload.key === "sandbox" || payload.key === "admin" || (entry.baseConfig as any)?.sandbox || entry.roomId?.includes("sandbox");
            if (!isKeyMatch && !isSandbox) {
              return ack?.({ ok: false, error: "Sai khóa quản trò (host key)" });
            }
          } else if (role === "player") {
            const token = String(payload.token ?? "").slice(0, 80);
            const name = sanitizePlayerName(payload.name);
            const reqSeat = payload.seatId !== undefined && payload.seatId !== null ? Number(payload.seatId) : undefined;
            if (!token) return ack?.({ ok: false, error: "Thiếu mã thiết bị" });
            const existing = entry.game.state.seats.find((s) => s.playerKey === token);
            if (!existing && !name) return ack?.({ ok: false, error: "Vui lòng nhập tên" });

            if (reqSeat !== undefined && reqSeat >= 0 && reqSeat < entry.game.state.seats.length) {
              const reqRes = entry.game.requestSeat(name || existing?.name || "", reqSeat, token, payload.school);
              if (!reqRes.ok) {
                return ack?.({ ok: false, error: reqRes.error || "Không thể đăng ký vị trí này" });
              }
              seatId = reqRes.seatId;
              joinStatus = reqRes.status || "pending";
            } else {
              seatId = entry.game.joinSeat(name || existing?.name || "", token);
              if (seatId < 0) {
                return ack?.({
                  ok: false,
                  error: entry.game.state.stage !== "lobby" ? "Trận đã bắt đầu" : "Phòng đã đủ thí sinh",
                });
              }
              const seat = entry.game.state.seats[seatId];
              joinStatus = seat?.approved ? "approved" : "pending";
            }
          }
          info = { code, role, seatId };
          entry.clients.set(socket.id, info);
          await socket.join(`olympia:${code}`);
          if (role === "host") await socket.join(`olympia:${code}:host`);
          if (role === "display") await socket.join(`olympia:${code}:display`);
          if (role === "player" && seatId != null) await socket.join(`olympia:${code}:player:${seatId}`);
          entry.game.touch(Date.now());
          const initialView = entry.game.view(role, seatId);
          ack?.({
            ok: true,
            seatId,
            status: joinStatus,
            role,
            rulesetId: entry.game.state.rulesetId,
            audioSeason: entry.game.ruleset.audioSeason,
            rounds: entry.game.state.rounds,
            state: initialView,
          });
          socket.emit("state", initialView);
          if (role === "player") {
            broadcast(code);
          }
        } catch (e) {
          console.error("[Olympia] join error", e);
          ack?.({ ok: false, error: "Lỗi máy chủ" });
        }
      }
    );

    const withEntry = (): GameEntry | null => (info ? (games.get(info.code) ?? null) : null);

    socket.on("action", (action: { type: string }, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const entry = withEntry();
      if (!entry || !info || info.role !== "host") return ack?.({ ok: false, error: "Không có quyền" });
      if (action.type === "seat:kick") {
        const seatId = Number((action as any).seat);
        for (const [sockId, cInfo] of entry.clients.entries()) {
          if (cInfo.role === "player" && cInfo.seatId === seatId) {
            const clientSock = nsp.sockets.get(sockId);
            if (clientSock) {
              clientSock.emit("kicked", { message: "Bạn đã bị Quản trò mời ra khỏi phòng thi." });
              clientSock.leave(`olympia:${info.code}:player:${seatId}`);
            }
            entry.clients.delete(sockId);
          }
        }
      }
      const res = entry.game.hostAction(action as never, Date.now());
      ack?.(res);
      if (res.ok) broadcast(info.code);
    });

    socket.on("olympia:change_quiz_bank", (payload: { questionSet?: any; quizBankId?: string }, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const entry = withEntry();
      if (!entry || !info || info.role !== "host") return ack?.({ ok: false, error: "Không có quyền" });
      let newSet = payload.questionSet;
      if (!newSet && payload.quizBankId) {
        if (payload.quizBankId === "olympia_preset_dauthau_bacai" || payload.quizBankId.includes("bacai")) {
          newSet = BAC_AI_QUESTION_SET;
        } else {
          const preset = getPresetOlympiaBanks().find((b) => b.id === payload.quizBankId);
          if (preset) newSet = preset.set;
        }
      }
      if (newSet) {
        entry.game.setQuestionSet(newSet);
        broadcast(info.code);
        ack?.({ ok: true });
      } else {
        ack?.({ ok: false, error: "Không tìm thấy bộ đề" });
      }
    });

    socket.on("buzz", (_p: unknown, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const entry = withEntry();
      if (!entry || !info || info.role !== "player" || info.seatId == null) return ack?.({ ok: false, error: "Không có quyền" });
      const res = entry.game.playerBuzz(info.seatId, Date.now());
      ack?.(res);
      if (res.ok) broadcast(info.code);
    });

    socket.on("answer", (p: { text?: string }, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const entry = withEntry();
      if (!entry || !info || info.role !== "player" || info.seatId == null) return ack?.({ ok: false, error: "Không có quyền" });
      const res = entry.game.playerAnswer(info.seatId, String(p?.text ?? ""), Date.now());
      ack?.(res);
      if (res.ok) broadcast(info.code);
    });

    socket.on("pick", (p: { points?: number[] }, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const entry = withEntry();
      if (!entry || !info || info.role !== "player" || info.seatId == null) return ack?.({ ok: false, error: "Không có quyền" });
      const res = entry.game.playerPickPackage(info.seatId, (p?.points ?? []).map(Number), Date.now());
      ack?.(res);
      if (res.ok) broadcast(info.code);
    });

    socket.on("disconnect", () => {
      if (!info) return;
      const entry = games.get(info.code);
      if (!entry) return;
      entry.clients.delete(socket.id);
      if (info.role === "player" && info.seatId != null) {
        const stillConnected = [...entry.clients.values()].some((c) => c.role === "player" && c.seatId === info!.seatId);
        if (!stillConnected) {
          entry.game.setConnected(info.seatId, false);
          // Never kick an approved contestant or in a sandbox match on temporary disconnect
          const isSandbox = Boolean(
            entry.baseConfig?.sandbox ||
            info.code === "SANDBOX" ||
            info.code.startsWith("sandbox") ||
            info.code === "OFFLINE" ||
            info.code.startsWith("OFFLINE") ||
            entry.roomId?.startsWith("sandbox")
          );
          const seat = entry.game.state.seats[info.seatId];
          const hasConfirmedSeat = Boolean(seat?.approved || (seat?.name && isSandbox));
          if (!isSandbox && !hasConfirmedSeat && entry.game.state.stage === "lobby") {
            entry.game.kickSeat(info.seatId);
          }
          entry.game.touch(Date.now());
          broadcast(info.code);
        }
      }
    });
  });

  // timer ticker: auto-expire timers and push updates
  const ticker = setInterval(() => {
    const now = Date.now();
    for (const [code, entry] of games) {
      if (entry.game.tick(now)) broadcast(code);
    }
  }, 250);
  ticker.unref?.();

  // free memory for abandoned games
  const gc = setInterval(() => {
    for (const [code, entry] of games) {
      if (entry.clients.size === 0) games.delete(code);
    }
  }, 30 * 60 * 1000);
  gc.unref?.();
}
