import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types";

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | undefined;

export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> | undefined {
  return io;
}

export function initSocketServer(
  httpServer: HTTPServer
): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  if (io) return io;

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 20000,
    pingInterval: 10000,
    perMessageDeflate: false,
  });

  return io;
}
