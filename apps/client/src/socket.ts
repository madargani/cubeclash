import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@cubeclash/types";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  io(SOCKET_URL);
