import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./handlers/index.js";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@cubeclash/types";

const app = express();
const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_ORIGIN || "http://localhost:5173"],
  },
});

io.on("connection", (socket) => {
  registerSocketHandlers(socket, io);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
