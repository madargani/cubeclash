import { randomUUID } from "node:crypto";
import type { Member, Room, RoomSettings } from "./types/index.ts";
import { DEFAULT_ROOM_SETTINGS } from "@cubeclash/types";

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const ID_LENGTH = 8;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let id = "";
  for (let i = 0; i < ID_LENGTH; i++)
    id += chars[Math.floor(Math.random() * chars.length)];

  return id;
}

export function createRoom(hostNickname: string): Room {
  let id: string;
  do {
    id = generateRoomId();
  } while (rooms.has(id));

  const host: Member = {
    id: randomUUID(),
    nickname: hostNickname,
    connected: true,
  };

  const room: Room = {
    id,
    hostMemberId: host.id,
    members: [host],
    round: -1,
    results: new Map(),
    scrambles: [],
    settings: { ...DEFAULT_ROOM_SETTINGS } as RoomSettings,
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
  nickname: string,
): Member | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  const member: Member = {
    id: randomUUID(),
    nickname,
    connected: true,
  };

  room.members.push(member);

  return member;
}

export function setMemberConnected(
  roomId: string,
  memberId: string,
  connected: boolean,
): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const member = room.members.find((m) => m.id === memberId);
  if (!member) return;

  member.connected = connected;
}

export function getMember(roomId: string, memberId: string): Member | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  return room.members.find((m) => m.id === memberId);
}

export function countConnected(roomId: string): number {
  const room = rooms.get(roomId);
  if (!room) return 0;

  return room.members.filter((m) => m.connected).length;
}

export function startGame(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const member of room.members) room.results.set(member.id, []);
  room.round = 0;
  room.scrambles = [];
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

  // Only connected members count toward round completion (design D2)
  for (const member of room.members) {
    if (!member.connected) continue;

    const memberRecords = room.results.get(member.id);
    if (memberRecords === undefined) return false;
    if (memberRecords.length <= room.round) return false;
  }

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
  return room.round < room.settings.rounds - 1;
}

export function incrementRound(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (room.round >= room.settings.rounds - 1) return false;
  room.round += 1;
  return true;
}

export function updateSettings(roomId: string, settings: RoomSettings): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  // Don't allow settings changes when game is in progress
  if (room.round >= 0) return false;

  // Validate settings values
  if (settings.rounds < 1) return false;
  if (settings.inspectionTime < 0) return false;

  room.settings = settings;
  return true;
}
