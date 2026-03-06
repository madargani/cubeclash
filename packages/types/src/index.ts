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

// Socket.io Types
export interface ServerToClientEvents {
  member_joined: (nickname: string) => void;
  member_left: (nickname: string) => void;
  start_round: (scramble: string, round: number) => void;
  round_done: (leaderboard: LeaderboardEntry[]) => void;
  game_over: (leaderboard: LeaderboardEntry[], scrambles: string[]) => void;
  settings_changed: (settings: RoomSettings) => void;
}

export interface ClientToServerEvents {
  create_room: (
    nickname: string,
    callback: (response: SocketCallbackResponse<string>) => void,
  ) => void;
  join_room: (
    nickname: string,
    roomId: string,
    callback: (response: SocketCallbackResponse<string[]>) => void,
  ) => void;
  start_game: (roomId: string) => void;
  next_round: (roomId: string) => void;
  submit_solve: (roomId: string, time: number) => void;
  update_settings: (roomId: string, settings: RoomSettings) => void;
}

export interface InterServerEvents {}

export interface SocketData {}

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
