import { create } from "zustand";
import type { LeaderboardEntry } from "@cubeclash/types";

interface RoomState {
  nickname: string;
  isHost: boolean;
  roomId: string;
  members: string[];
  roomState: "lobby" | "timer" | "leaderBoard";
  scramble: string;
  leaderboard: LeaderboardEntry[];
  actions: {
    setNickname: (nickname: string) => void;
    setIsHost: (isHost: boolean) => void;
    setRoomId: (roomId: string) => void;
    setMembers: (members: string[]) => void;
    addMember: (nickname: string) => void;
    setRoomState: (roomState: "lobby" | "timer" | "leaderBoard") => void;
    setScramble: (scramble: string) => void;
    setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  };
}

const useRoomStore = create<RoomState>()((set) => ({
  nickname: "",
  isHost: false,
  roomId: "",
  members: [],
  roomState: "lobby",
  scramble: "",
  leaderboard: [],
  actions: {
    setNickname: (nickname) => set((_state) => ({ nickname: nickname })),
    setIsHost: (isHost) => set((_state) => ({ isHost: isHost })),
    setRoomId: (roomId) => set((_state) => ({ roomId: roomId })),
    setMembers: (members) => set((_state) => ({ members: members })),
    addMember: (nickname) =>
      set((state) => ({ members: [...state.members, nickname] })),
    setRoomState: (roomState) => set((_state) => ({ roomState: roomState })),
    setScramble: (scramble) => set((_state) => ({ scramble: scramble })),
    setLeaderboard: (leaderboard) =>
      set((_state) => ({ leaderboard: leaderboard })),
  },
}));

export function useNickname() {
  return useRoomStore((state) => state.nickname);
}

export function useIsHost() {
  return useRoomStore((state) => state.isHost);
}

export function useRoomId() {
  return useRoomStore((state) => state.roomId);
}

export function useMembers() {
  return useRoomStore((state) => state.members);
}

export function useRoomState() {
  return useRoomStore((state) => state.roomState);
}

export function useScramble() {
  return useRoomStore((state) => state.scramble);
}

export function useLeaderboard() {
  return useRoomStore((state) => state.leaderboard);
}

export function useRoomActions() {
  return useRoomStore((state) => state.actions);
}
