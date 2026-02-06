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

  const room = {
    id,
    hostId,
    members: [host],
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
  if (!room)
    throw new Error(`Failed to add member. Room ${roomId} doesn't exist.`);

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
