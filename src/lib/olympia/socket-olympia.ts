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
    const room = await prisma.room.findUnique({
      where: { code },
      select: { id: true, mode: true, config: true, hostKey: true },
    });
    if (!room || room.mode !== ("OLYMPIA" as typeof room.mode)) return null;
    const cfg = (room.config && typeof room.config === "object" ? room.config : {}) as Record<string, unknown>;
    const olympia = cfg.olympia as OlympiaConfig | undefined;
    if (!olympia) return null;
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
      await prisma.room.update({ where: { id: entry.roomId }, data: data as never });
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
    const hostView = g.view("host");
    const displayView = g.view("display");
    const playerViews = new Map<number, OlympiaState>();
    for (const [sid, info] of entry.clients) {
      const sock = nsp.sockets.get(sid);
      if (!sock) {
        entry.clients.delete(sid);
        continue;
      }
      if (info.role === "host") sock.emit("state", hostView);
      else if (info.role === "display") sock.emit("state", displayView);
      else {
        const seat = info.seatId ?? -1;
        if (!playerViews.has(seat)) playerViews.set(seat, g.view("player", seat));
        sock.emit("state", playerViews.get(seat));
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
        payload: { code?: string; role?: Role; key?: string; name?: string; token?: string },
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
          if (role === "host") {
            if (!entry.hostKey || payload.key !== entry.hostKey) {
              return ack?.({ ok: false, error: "Sai khóa quản trò (host key)" });
            }
          } else if (role === "player") {
            const token = String(payload.token ?? "").slice(0, 80);
            const name = sanitizePlayerName(payload.name);
            if (!token) return ack?.({ ok: false, error: "Thiếu mã thiết bị" });
            const existing = entry.game.state.seats.find((s) => s.playerKey === token);
            if (!existing && !name) return ack?.({ ok: false, error: "Vui lòng nhập tên" });
            seatId = entry.game.joinSeat(name || existing?.name || "", token);
            if (seatId < 0) {
              return ack?.({
                ok: false,
                error: entry.game.state.stage !== "lobby" ? "Trận đã bắt đầu" : "Phòng đã đủ 8 thí sinh",
              });
            }
          }
          info = { code, role, seatId };
          entry.clients.set(socket.id, info);
          await socket.join(`olympia:${code}`);
          entry.game.touch(Date.now());
          ack?.({
            ok: true,
            seatId,
            role,
            rulesetId: entry.game.state.rulesetId,
            audioSeason: entry.game.ruleset.audioSeason,
            rounds: entry.game.state.rounds,
          });
          broadcast(code);
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
      const res = entry.game.hostAction(action as never, Date.now());
      ack?.(res);
      if (res.ok) broadcast(info.code);
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
          // free the seat while still in the lobby so others can join
          if (entry.game.state.stage === "lobby") entry.game.kickSeat(info.seatId);
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
