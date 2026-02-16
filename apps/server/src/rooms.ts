import type { Member, Room } from "./types/index.ts";

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const ID_LENGTH = 8;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let id = "";
  for (let i = 0; i < ID_LENGTH; i++)
    id += chars[Math.floor(Math.random() * chars.length)];

  return id;
}

export function createRoom(hostId: string, hostNickname: string): Room {
  let id: string;
  do {
    id = generateRoomId();
  } while (rooms.has(id));

  const host: Member = {
    id: hostId,
    nickname: hostNickname,
  };

  const room: Room = {
    id,
    hostId,
    members: [host],
    round: -1,
    results: new Map(),
  };

  rooms.set(id, room);

  return room;
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function roomExists(roomId: string): boolean {
  return rooms.has(roomId);
}

export function addMember(
  roomId: string,
  memberId: string,
  nickname: string,
): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const member: Member = {
    id: memberId,
    nickname,
  };

  room.members.push(member);
}

export function removeMember(roomId: string, memberId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (let i = 0; i < room.members.length; i++) {
    if (room.members[i]?.id == memberId) {
      room.members.splice(i, 1);
      return;
    }
  }
}

export function startGame(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const member of room.members) room.results.set(member.id, []);
  room.round = 0;
}

export function addResult(
  roomId: string,
  memberId: string,
  time: number,
): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const memberRecords = room.results.get(memberId);
  if (memberRecords === undefined) return;

  // if result already sent
  if (memberRecords.length > room.round) return;

  memberRecords.push(time);
}

export function areAllDone(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  for (const memberRecords of room.results.values())
    if (memberRecords.length <= room.round) return false;

  return true;
}

export function getCurrentRound(roomId: string): number {
  const room = rooms.get(roomId);
  if (!room) return -1;
  return room.round;
}

export function canStartNextRound(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  return room.round < 4; // Rounds 0-4 = 5 rounds total
}

export function incrementRound(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (room.round >= 4) return false;
  room.round += 1;
  return true;
}
