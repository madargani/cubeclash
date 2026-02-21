import { useCallback } from "react";
import { socket } from "@/socket";


export function useSocketActions() {
  const createRoom = useCallback(
    (nickname: string, callback: (roomId: string) => void) => {
      socket.emit("create_room", nickname, callback);
    },
    [],
  );

  const joinRoom = useCallback(
    (
      nickname: string,
      roomId: string,
      callback: (members: string[] | null) => void,
    ) => {
      socket.emit("join_room", nickname, roomId, callback);
    },
    [],
  );

  const startGame = useCallback((roomId: string) => {
    socket.emit("start_game", roomId);
  }, []);

  const nextRound = useCallback((roomId: string) => {
    socket.emit("next_round", roomId);
  }, []);

  const submitSolve = useCallback((roomId: string, time: number) => {
    socket.emit("submit_solve", roomId, time);
  }, []);

  return {
    createRoom,
    joinRoom,
    startGame,
    nextRound,
    submitSolve,
  };
}
