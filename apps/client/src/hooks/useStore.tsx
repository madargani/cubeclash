import { create } from "zustand";

interface GameState {
  nickname: string;
  isHost: boolean;
  roomId: string;
  members: string[];
  roomState: "lobby" | "timer" | "leaderBoard";
  scramble: string;
  actions: {
    setNickname: (nickname: string) => void;
    setRoomId: (roomId: string) => void;
    setMembers: (members: string[]) => void;
    addMember: (nickname: string) => void;
    setRoomState: (roomState: "lobby" | "timer" | "leaderBoard") => void;
    setScramble: (scramble: string) => void;
  };
}

const useGameStore = create<GameState>()((set) => ({
  nickname: "",
  isHost: false,
  roomId: "",
  members: [],
  roomState: "lobby",
  scramble: "",
  actions: {
    setNickname: (nickname) => set((_state) => ({ nickname: nickname })),
    setRoomId: (roomId) => set((_state) => ({ roomId: roomId })),
    setMembers: (members) => set((_state) => ({ members: members })),
    addMember: (nickname) =>
      set((state) => ({ members: [...state.members, nickname] })),
    setRoomState: (roomState) => set((_state) => ({ roomState: roomState })),
    setScramble: (scramble) => set((_state) => ({ scramble: scramble })),
  },
}));

export function useNickname() {
  return useGameStore((state) => state.nickname);
}

export function useRoomId() {
  return useGameStore((state) => state.roomId);
}

export function useMembers() {
  return useGameStore((state) => state.members);
}

export function useRoomState() {
  return useGameStore((state) => state.roomState);
}

export function useScramble() {
  return useGameStore((state) => state.scramble);
}

export function useGameActions() {
  return useGameStore((state) => state.actions);
}
