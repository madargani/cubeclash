import type { RoomSettings } from "@cubeclash/types";
export type { RoomSettings };

export interface Member {
  id: string;
  nickname: string;
  connected: boolean;
}

export interface Room {
  id: string;
  hostMemberId: string;
  members: Member[];
  round: number;
  results: Map<string, number[]>;
  scrambles: string[];
  settings: RoomSettings;
}
