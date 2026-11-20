import { create } from "zustand";
import {
  DEFAULT_ROOM_SETTINGS,
  type RoomSnapshot,
  type RoomSettings,
} from "@cubeclash/types";

interface GameState {
  room: RoomSnapshot | null;
  nickname: string;
  homeError: string | null;
  memberId: string;
  actions: {
    setRoom: (room: RoomSnapshot) => void;
    setNickname: (nickname: string) => void;
    setHomeError: (error: string | null) => void;
    setMemberId: (memberId: string) => void;
    resetRoom: () => void;
  };
}

export const useGameStore = create<GameState>()((set) => ({
  room: null,
  nickname: "",
  homeError: null,
  memberId: "",
  actions: {
    setRoom: (room) => set({ room }),
    setNickname: (nickname) => set({ nickname }),
    setHomeError: (homeError) => set({ homeError }),
    setMemberId: (memberId) => set({ memberId }),
    resetRoom: () => set({ room: null }),
  },
}));

export function useNickname() {
  return useGameStore((state) => state.nickname);
}

export function useHomeError() {
  return useGameStore((state) => state.homeError);
}

export function useRoomSnapshot() {
  return useGameStore((state) => state.room);
}

export function useRoomId() {
  return useGameStore((state) => state.room?.roomId ?? "");
}

export function useRoomPhase() {
  return useGameStore((state) => state.room?.phase ?? "lobby");
}

export function useLeaderboard() {
  return useGameStore((state) => state.room?.leaderboard ?? []);
}

export function useScrambles() {
  return useGameStore((state) => state.room?.scrambles ?? []);
}

export function useSettings() {
  return useGameStore(
    (state) => state.room?.settings ?? (DEFAULT_ROOM_SETTINGS as RoomSettings),
  );
}

export function useMembers() {
  return useGameStore((state) => state.room?.members ?? []);
}

export function useIsHost() {
  return useGameStore(
    (state) =>
      state.room !== null &&
      state.memberId !== "" &&
      state.room.hostMemberId === state.memberId,
  );
}

export function useCurrentRound() {
  return useGameStore((state) => state.room?.round ?? -1);
}

export function useCurrentScramble() {
  return useGameStore((state) => {
    const room = state.room;
    return room ? (room.scrambles[room.round] ?? "") : "";
  });
}

export function useMemberId() {
  return useGameStore((state) => state.memberId);
}

export function useGameActions() {
  return useGameStore((state) => state.actions);
}
