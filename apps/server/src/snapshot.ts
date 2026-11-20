import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  LeaderboardEntry,
  RoomMemberView,
  RoomPhase,
  RoomSnapshot,
  ServerToClientEvents,
  SocketData,
} from "@cubeclash/types";
import type { Room } from "./types/index.ts";

type CubeClashServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function calculateLeaderboard(room: Room): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  for (const member of room.members) {
    const times = room.results.get(member.id) || [];
    const rounds: (number | null)[] = [];

    // Fill rounds with times or null
    for (let i = 0; i < room.settings.rounds; i++) {
      rounds.push(times[i] || null);
    }

    // Calculate average if all rounds done
    let average = null;
    if (times.length == room.settings.rounds) {
      const validTimes = times.filter((x) => x > 0);
      if (validTimes.length >= room.settings.rounds - 1) {
        // Remove best and worst time
        validTimes.sort();
        if (validTimes.length == room.settings.rounds) validTimes.pop();
        validTimes.shift();

        average = validTimes.reduce((sum, x) => sum + x) / validTimes.length;
      }
    }

    // Calculate best time
    const validTimes = times.filter((x) => x > 0);
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

export function derivePhase(room: Room): RoomPhase {
  if (room.round < 0) return "lobby";

  // Solving while any connected member's results row is short for the
  // current round (design D2)
  const connectedMembers = room.members.filter((member) => member.connected);
  const allDone = connectedMembers.every((member) => {
    const times = room.results.get(member.id);
    return times !== undefined && times.length > room.round;
  });

  if (!allDone) return "solving";

  return room.round === room.settings.rounds - 1 ? "game_over" : "round_done";
}

export function deriveHostMemberId(room: Room): string {
  // The room's host member when connected, else the first connected
  // member in join order (design D2)
  const host = room.members.find((member) => member.id === room.hostMemberId);
  if (host?.connected) return host.id;

  const firstConnected = room.members.find((member) => member.connected);
  return firstConnected?.id ?? "";
}

export function snapshotOf(room: Room): RoomSnapshot {
  const members: RoomMemberView[] = room.members.map((member) => ({
    id: member.id,
    nickname: member.nickname,
    connected: member.connected,
  }));

  return {
    roomId: room.id,
    hostMemberId: deriveHostMemberId(room),
    phase: derivePhase(room),
    round: room.round,
    settings: room.settings,
    scrambles: room.scrambles,
    members,
    leaderboard: calculateLeaderboard(room),
  };
}

export function broadcastRoomState(io: CubeClashServer, room: Room): void {
  io.to(room.id).emit("room_state", snapshotOf(room));
}
