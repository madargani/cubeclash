import { useCallback } from "react";
import { socket } from "@/socket";
import type { RoomSettings, SocketCallbackResponse } from "@cubeclash/types";

export function useSocketActions() {
  const createRoom = useCallback(
    (
      nickname: string,
      callback: (
        response: SocketCallbackResponse<{ roomId: string; memberId: string }>,
      ) => void,
    ) => {
      socket.emit("create_room", nickname, callback);
    },
    [],
  );

  const joinRoom = useCallback(
    (
      nickname: string,
      roomId: string,
      callback: (
        response: SocketCallbackResponse<{ memberId: string }>,
      ) => void,
    ) => {
      socket.emit("join_room", nickname, roomId, callback);
    },
    [],
  );

  const rejoinRoom = useCallback(
    (
      roomId: string,
      memberId: string,
      callback: (response: SocketCallbackResponse<null>) => void,
    ) => {
      socket.emit("rejoin_room", roomId, memberId, callback);
    },
    [],
  );

  const startGame = useCallback(() => {
    socket.emit("start_game");
  }, []);

  const nextRound = useCallback(() => {
    socket.emit("next_round");
  }, []);

  const submitSolve = useCallback((time: number) => {
    socket.emit("submit_solve", time);
  }, []);

  const updateSettings = useCallback((settings: RoomSettings) => {
    socket.emit("update_settings", settings);
  }, []);

  return {
    createRoom,
    joinRoom,
    rejoinRoom,
    startGame,
    nextRound,
    submitSolve,
    updateSettings,
  };
}
