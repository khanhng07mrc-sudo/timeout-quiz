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
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  return io;
}
