import { create } from "zustand";
import type { LeaderboardEntry } from "@cubeclash/types";

interface GameState {
  nickname: string;
  isHost: boolean;
  roomId: string;
  members: string[];
  roomState: "lobby" | "timer" | "leaderBoard";
  scramble: string;
  leaderboard: LeaderboardEntry[];
  currentRound: number;
  actions: {
    setNickname: (nickname: string) => void;
    setIsHost: (isHost: boolean) => void;
    setRoomId: (roomId: string) => void;
    setMembers: (members: string[]) => void;
    addMember: (nickname: string) => void;
    setGameState: (roomState: "lobby" | "timer" | "leaderBoard") => void;
    setScramble: (scramble: string) => void;
    setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
    setCurrentRound: (round: number) => void;
  };
}

const useGameStore = create<GameState>()((set) => ({
  nickname: "",
  isHost: false,
  roomId: "",
  members: [],
  roomState: "lobby",
  scramble: "",
  leaderboard: [],
  currentRound: -1,
  actions: {
    setNickname: (nickname) => set((_state) => ({ nickname: nickname })),
    setIsHost: (isHost) => set((_state) => ({ isHost: isHost })),
    setRoomId: (roomId) => set((_state) => ({ roomId: roomId })),
    setMembers: (members) => set((_state) => ({ members: members })),
    addMember: (nickname) =>
      set((state) => ({ members: [...state.members, nickname] })),
    setGameState: (roomState) => set((_state) => ({ roomState: roomState })),
    setScramble: (scramble) => set((_state) => ({ scramble: scramble })),
    setLeaderboard: (leaderboard) =>
      set((_state) => ({ leaderboard: leaderboard })),
    setCurrentRound: (round) => set((_state) => ({ currentRound: round })),
  },
}));

export function useNickname() {
  return useGameStore((state) => state.nickname);
}

export function useIsHost() {
  return useGameStore((state) => state.isHost);
}

export function useRoomId() {
  return useGameStore((state) => state.roomId);
}

export function useMembers() {
  return useGameStore((state) => state.members);
}

export function useGameState() {
  return useGameStore((state) => state.roomState);
}

export function useScramble() {
  return useGameStore((state) => state.scramble);
}

export function useLeaderboard() {
  return useGameStore((state) => state.leaderboard);
}

export function useGameActions() {
  return useGameStore((state) => state.actions);
}

export function useCurrentRound() {
  return useGameStore((state) => state.currentRound);
}
