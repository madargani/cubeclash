import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  LeaderboardEntry,
} from "@cubeclash/types";
import {
  addResult,
  areAllDone,
  canStartNextRound,
  getRoom,
  getCurrentRound,
  incrementRound,
  startGame,
} from "../rooms.js";
import { generateScramble } from "../types/scramble.js";
import type { Room } from "../types/index.ts";

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

function calculateLeaderboard(room: Room): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  for (const member of room.members) {
    const times = room.results.get(member.id) || [];
    const rounds: (number | null)[] = [];

    // Fill rounds 1-5 with times or null
    for (let i = 0; i < 5; i++) {
      const time = i < times.length ? times[i] : undefined;
      rounds.push(time ?? null);
    }

    // Calculate average if at least one time exists
    const validTimes = times.filter((t) => t !== undefined);
    const average =
      validTimes.length > 0
        ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
        : null;

    // Calculate best time
    const best = validTimes.length > 0 ? Math.min(...validTimes) : null;

    entries.push({
      rank: 0, // Will be calculated after sorting
      name: member.nickname,
      rounds,
      average,
      best,
    });
  }

  // Sort by average (null averages go to bottom)
  entries.sort((a, b) => {
    if (a.average === null && b.average === null) return 0;
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return a.average - b.average;
  });

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}

export function registerGameHandlers(
  socket: CubeClashSocket,
  io: CubeClashServer,
) {
  socket.on("start_game", async (roomId) => {
    const room = getRoom(roomId);

    if (!room) return;
    if (room.hostId != socket.id) return;

    startGame(room.id);
    const scramble = await generateScramble();
    room.scrambles.push(scramble);
    io.to(roomId).emit("start_round", scramble, 0);

    console.log(`Room ${roomId} started game`);
  });

  socket.on("next_round", async (roomId) => {
    const room = getRoom(roomId);

    if (!room) return;
    if (room.hostId != socket.id) return;

    if (!canStartNextRound(roomId)) {
      console.log(
        `Room ${roomId} attempted to start next round but max rounds reached`,
      );
      return;
    }

    const success = incrementRound(roomId);
    if (!success) return;

    const currentRound = getCurrentRound(roomId);
    const scramble = await generateScramble();
    room.scrambles.push(scramble);
    io.to(roomId).emit("start_round", scramble, currentRound);

    console.log(`Room ${roomId} started round ${currentRound + 1}`);
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
      const leaderboard = calculateLeaderboard(room);
      const scrambles = room.scrambles;

      // Check if this was the final round (round 4 = 5th round, 0-indexed)
      if (room.round === 4) {
        io.to(roomId).emit("game_over", leaderboard, scrambles);
        console.log(`Room ${room.id} game over after round 5`);
      } else {
        io.to(roomId).emit("round_done", leaderboard);
        console.log(`Room ${room.id} results for round ${room.round}:`);
      }
    }
  });
}
