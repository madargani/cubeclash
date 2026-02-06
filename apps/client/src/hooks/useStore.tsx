import { create } from "zustand";

interface GameState {
  nickname: string;
  isHost: boolean;
  roomId: string;
  members: string[];
  roomState: "lobby" | "timer" | "leaderBoard";
  actions: {
    setNickname: (nickname: string) => void;
    setRoomId: (roomId: string) => void;
    setMembers: (members: string[]) => void;
    addMember: (nickname: string) => void;
    setRoomState: (roomState: "lobby" | "timer" | "leaderBoard") => void;
  };
}

const useGameStore = create<GameState>()((set) => ({
  nickname: "",
  isHost: false,
  roomId: "",
  members: [],
  roomState: "lobby",
  actions: {
    setNickname: (nickname) => set((_state) => ({ nickname: nickname })),
    setRoomId: (roomId) => set((_state) => ({ roomId: roomId })),
    setMembers: (members) => set((_state) => ({ members: members })),
    addMember: (nickname) =>
      set((state) => ({ members: [...state.members, nickname] })),
    setRoomState: (roomState) => set((_state) => ({ roomState: roomState })),
  },
}));

export function useNickname() {
  return useGameStore((state) => state.nickname);
}

export function useMembers() {
  return useGameStore((state) => state.members);
}

export function useRoomState() {
  return useGameStore((state) => state.roomState);
}

export function useGameActions() {
  return useGameStore((state) => state.actions);
}
