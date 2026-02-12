import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@cubeclash/types";
import { addResult, areAllDone, getRoom, startGame } from "../rooms.js";
import { generateScramble } from "../types/scramble.js";

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

export function registerGameHandlers(
  socket: CubeClashSocket,
  io: CubeClashServer,
) {
  socket.on("start_game", async (roomId) => {
    const room = getRoom(roomId);

    if (!room) return;
    if (room.hostId != socket.id) return;

    startGame(room.id);
    io.to(roomId).emit("start_round", await generateScramble());

    console.log(`Room ${roomId} started game`);
  });

  socket.on("submit_solve", (roomId, time) => {
    const room = getRoom(roomId);
    if (!room) return;

    addResult(roomId, socket.id, time);

    console.log(
      `User ${socket.id} completed solve in ${time.toFixed(2)} seconds`,
    );

    // If all solvers are done, post results
    if (areAllDone(roomId)) {
      socket.emit("round_done", room.results);
      const resultString = Array.from(room.results.entries());
      console.log(
        `Room ${room.id} results for round ${room.round}: ${resultString}`,
      );
    }
  });
}
