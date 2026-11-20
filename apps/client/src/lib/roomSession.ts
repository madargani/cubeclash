const STORAGE_KEY = "cubeclash.roomSession";

export interface RoomSession {
  roomId: string;
  memberId: string;
  nickname: string;
}

export function loadRoomSession(): RoomSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as RoomSession).roomId !== "string" ||
      typeof (parsed as RoomSession).memberId !== "string" ||
      typeof (parsed as RoomSession).nickname !== "string"
    ) {
      return null;
    }

    return {
      roomId: (parsed as RoomSession).roomId,
      memberId: (parsed as RoomSession).memberId,
      nickname: (parsed as RoomSession).nickname,
    };
  } catch {
    return null;
  }
}

export function saveRoomSession(session: RoomSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private mode, quota); the game still works
    // for this tab, only reload recovery is lost.
  }
}

export function clearRoomSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
