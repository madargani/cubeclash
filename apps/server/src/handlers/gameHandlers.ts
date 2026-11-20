import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@cubeclash/types";
import {
  addResult,
  canStartNextRound,
  getRoom,
  getCurrentRound,
  incrementRound,
  startGame,
} from "../rooms.js";
import { generateScramble } from "../types/scramble.js";
import { broadcastRoomState, deriveHostMemberId } from "../snapshot.js";

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
  socket.on("start_game", async () => {
    const { roomId, memberId } = socket.data;
    if (roomId === undefined || memberId === undefined) return;

    const room = getRoom(roomId);
    if (!room) return;

    // Only the effective host can start the game
    if (deriveHostMemberId(room) !== memberId) return;

    // check if game already started
    if (room.scrambles.length > 0) return;

    startGame(room.id);
    const scramble = await generateScramble(room.settings.event);
    room.scrambles.push(scramble);

    broadcastRoomState(io, room);

    console.log(`Room ${roomId} started game`);
  });

  socket.on("next_round", async () => {
    const { roomId, memberId } = socket.data;
    if (roomId === undefined || memberId === undefined) return;

    const room = getRoom(roomId);
    if (!room) return;

    // Only the effective host can advance rounds
    if (deriveHostMemberId(room) !== memberId) return;

    if (!canStartNextRound(roomId)) {
      console.log(
        `Room ${roomId} attempted to start next round but max rounds reached`,
      );
      return;
    }

    const success = incrementRound(roomId);
    if (!success) return;

    const currentRound = getCurrentRound(roomId);
    const scramble = await generateScramble(room.settings.event);
    room.scrambles.push(scramble);

    broadcastRoomState(io, room);

    console.log(`Room ${roomId} started round ${currentRound + 1}`);
  });

  socket.on("submit_solve", (time) => {
    const { roomId, memberId } = socket.data;
    if (roomId === undefined || memberId === undefined) return;

    const room = getRoom(roomId);
    if (!room) return;

    addResult(roomId, memberId, time);

    console.log(
      `Member ${memberId} completed solve in ${time.toFixed(2)} seconds`,
    );

    broadcastRoomState(io, room);
  });
}
