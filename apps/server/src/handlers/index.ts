import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@cubeclash/types";
import { registerRoomHandlers } from "./roomHandlers.js";
import { registerGameHandlers } from "./gameHandlers.js";

type CubeClashSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type CubeClashServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerSocketHandlers(socket: CubeClashSocket, io: CubeClashServer) {
  console.log(`User connected: ${socket.id}`);

  registerRoomHandlers(socket);
  registerGameHandlers(socket, io);
}
