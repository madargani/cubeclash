import type { Room } from "./types.js";

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const ID_LENGTH = 8;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let id = "";
  for (let i = 0; i < ID_LENGTH; i++)
    id += chars[Math.floor(Math.random() * chars.length)];

  return id;
}

export function createRoom(hostId: string): Room {
  let id: string;
  do {
    id = generateRoomId();
  } while (rooms.has(id));

  const room = {
    id,
    hostId,
    members: [hostId],
  };

  rooms.set(id, room);

  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function roomExists(roomId: string): boolean {
  return rooms.has(roomId);
}

export function addMember(roomId: string, memberId: string): void {
  const room = rooms.get(roomId);
  if (!room)
    throw new Error(`Failed to add member. Room ${roomId} doesn't exist.`);

  room.members.push(memberId);
}
