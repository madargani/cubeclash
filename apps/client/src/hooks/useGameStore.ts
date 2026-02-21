import { create } from "zustand";
import type { LeaderboardEntry } from "@cubeclash/types";

interface GameState {
  nickname: string;
  hostNickname: string;
  roomId: string;
  members: string[];
  stage: "lobby" | "timer" | "leaderboard";
  scrambles: string[];
  leaderboard: LeaderboardEntry[];
  currentRound: number;
  actions: {
    setNickname: (nickname: string) => void;
    setHostNickname: (hostNickname: string) => void;
    setRoomId: (roomId: string) => void;
    setMembers: (members: string[]) => void;
    addMember: (nickname: string) => void;
    setStage: (stage: "lobby" | "timer" | "leaderboard") => void;
    addScramble: (scramble: string) => void;
    setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
    setCurrentRound: (round: number) => void;
  };
}

export const useGameStore = create<GameState>()((set) => ({
  nickname: "",
  hostNickname: "",
  roomId: "",
  members: [],
  stage: "lobby",
  scrambles: [],
  leaderboard: [],
  currentRound: -1,
  actions: {
    setNickname: (nickname) => set((_state) => ({ nickname: nickname })),
    setHostNickname: (hostNickname) =>
      set((_state) => ({ hostNickname: hostNickname })),
    setRoomId: (roomId) => set((_state) => ({ roomId: roomId })),
    setMembers: (members) => set((_state) => ({ members: members })),
    addMember: (nickname) =>
      set((state) => ({ members: [...state.members, nickname] })),
    setStage: (stage) => set((_state) => ({ stage: stage })),
    addScramble: (scramble) =>
      set((state) => ({ scrambles: [...state.scrambles, scramble] })),
    setLeaderboard: (leaderboard) =>
      set((_state) => ({ leaderboard: leaderboard })),
    setCurrentRound: (round) => set((_state) => ({ currentRound: round })),
  },
}));

export function useNickname() {
  return useGameStore((state) => state.nickname);
}

export function useIsHost() {
  const hostNickname = useGameStore((state) => state.hostNickname);
  return hostNickname !== "";
}

export function useRoomId() {
  return useGameStore((state) => state.roomId);
}

export function useMembers() {
  return useGameStore((state) => state.members);
}

export function useGameState() {
  return useGameStore((state) => state.stage);
}

export function useScramble() {
  return useGameStore((state) => state.scrambles);
}

export function useCurrentScramble() {
  const scrambles = useGameStore((state) => state.scrambles);
  const currentRound = useGameStore((state) => state.currentRound);
  return scrambles[currentRound + 1] || "";
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
