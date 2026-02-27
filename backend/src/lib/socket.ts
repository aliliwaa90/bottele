import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

type SocketClaims = {
  userId: string;
  role: "USER" | "ADMIN";
};

let io: Server | undefined;
const noopSocket = {
  to() {
    return noopSocket;
  },
  emit() {
    return false;
  }
};

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.SOCKET_CORS_ORIGIN.split(","),
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next();
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as SocketClaims;
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Unauthorized socket token."));
    }
  });

  io.on("connection", (socket) => {
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId as string}`);
    }
    socket.join("leaderboard:global");
  });

  return io;
}

export function getSocket(): Server {
  return io ?? (noopSocket as unknown as Server);
}
