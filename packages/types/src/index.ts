// Generic response wrapper for socket callbacks
export type SocketCallbackResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; message: string };

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  name: string;
  rounds: (number | null)[];
  average: number | null;
  best: number | null;
}

// Room Snapshot Types
export type RoomPhase = "lobby" | "solving" | "round_done" | "game_over";

export interface RoomMemberView {
  id: string;
  nickname: string;
  connected: boolean;
}

export interface RoomSnapshot {
  roomId: string;
  hostMemberId: string;
  phase: RoomPhase;
  round: number;
  settings: RoomSettings;
  scrambles: string[];
  members: RoomMemberView[];
  leaderboard: LeaderboardEntry[];
}

// Socket.io Types
export interface ServerToClientEvents {
  room_state: (snapshot: RoomSnapshot) => void;
}

export interface ClientToServerEvents {
  create_room: (
    nickname: string,
    callback: (
      response: SocketCallbackResponse<{ roomId: string; memberId: string }>,
    ) => void,
  ) => void;
  join_room: (
    nickname: string,
    roomId: string,
    callback: (response: SocketCallbackResponse<{ memberId: string }>) => void,
  ) => void;
  start_game: () => void;
  next_round: () => void;
  submit_solve: (time: number) => void;
  update_settings: (settings: RoomSettings) => void;
  rejoin_room: (
    roomId: string,
    memberId: string,
    callback: (response: SocketCallbackResponse<null>) => void,
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomId?: string;
  memberId?: string;
}

// Room Settings

// Runtime constants - use these in UI to render options
export const ROOM_EVENT_OPTIONS = ["3x3", "4x4"] as const;
export const ROUND_OPTIONS = [5] as const;
export const DEFAULT_INSPECTION_TIME = 60;

// Types derived from constants - these update automatically when you add options
export type RoomEvent = (typeof ROOM_EVENT_OPTIONS)[number];
export type RoundOption = (typeof ROUND_OPTIONS)[number];
export type InspectionTime = number;

// Default settings - use in both server and client
export const DEFAULT_ROOM_SETTINGS = {
  event: ROOM_EVENT_OPTIONS[0],
  rounds: ROUND_OPTIONS[0],
  inspectionTime: DEFAULT_INSPECTION_TIME,
} as const;

// Room Settings interface - uses derived types
export interface RoomSettings {
  event: RoomEvent;
  rounds: RoundOption;
  inspectionTime: InspectionTime;
}
