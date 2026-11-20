import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useGameActions, useNickname } from "./useGameStore";
import { useSocketActions } from "./useSocketActions";
import { saveRoomSession } from "@/lib/roomSession";
import { markRoomBound } from "./useRoomSync";

export function useHomeActions() {
  const nickname = useNickname();
  const { setNickname, setMemberId, setHomeError } = useGameActions();
  const { createRoom, joinRoom } = useSocketActions();
  const navigate = useNavigate();

  const handleCreateRoom = useCallback(
    (fallbackUsername?: string) => {
      const finalNickname = nickname || fallbackUsername;
      if (!finalNickname) return;

      setNickname(finalNickname);
      setHomeError(null);

      createRoom(finalNickname, (response) => {
        if (response.status === "error") {
          setHomeError(response.message);
          return;
        }

        const { roomId, memberId } = response.data;
        setMemberId(memberId);
        markRoomBound();
        saveRoomSession({ roomId, memberId, nickname: finalNickname });
        navigate("/room");
      });
    },
    [nickname, navigate, setNickname, setMemberId, setHomeError, createRoom],
  );

  const handleJoinRoom = useCallback(
    (fallbackUsername?: string, roomId?: string) => {
      const finalNickname = nickname || fallbackUsername;
      if (!finalNickname || !roomId) return;

      setNickname(finalNickname);
      setHomeError(null);

      joinRoom(finalNickname, roomId, (response) => {
        if (response.status === "error") {
          setHomeError(response.message);
          return;
        }

        const { memberId } = response.data;
        setMemberId(memberId);
        markRoomBound();
        saveRoomSession({ roomId, memberId, nickname: finalNickname });
        navigate("/room");
      });
    },
    [nickname, navigate, setNickname, setMemberId, setHomeError, joinRoom],
  );

  return { handleCreateRoom, handleJoinRoom };
}
