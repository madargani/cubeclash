import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useGameActions, useNickname, useRoomId } from "./useGameStore";
import { useSocketActions } from "./useSocketActions";

export function useHomeActions() {
  const nickname = useNickname();
  const roomId = useRoomId();
  const { setNickname, setMembers, setRoomId, setHostNickname, setHomeError } =
    useGameActions();
  const { createRoom, joinRoom } = useSocketActions();
  const navigate = useNavigate();

  const handleCreateRoom = useCallback((fallbackUsername?: string) => {
    const finalNickname = nickname || fallbackUsername;
    if (!finalNickname) return;
    setHostNickname(finalNickname);
    setHomeError(null);
    createRoom(finalNickname, (response) => {
      if (response.status === "error") {
        setHomeError(response.message);
        return;
      }
      setRoomId(response.data);
      setMembers([finalNickname]);
      navigate("/room");
    });
  }, [nickname, navigate, setNickname, setHostNickname, setRoomId, setMembers, setHomeError, createRoom]);

  const handleJoinRoom = useCallback((fallbackUsername?: string) => {
    const finalNickname = nickname || fallbackUsername;
    if (!finalNickname || !roomId) return;
    setHostNickname("");
    setHomeError(null);
    joinRoom(finalNickname, roomId, (response) => {
      if (response.status === "error") {
        setHomeError(response.message);
        return;
      }
      setMembers(response.data);
      navigate("/room");
    });
  }, [
    nickname,
    roomId,
    navigate,
    setNickname,
    setHostNickname,
    setRoomId,
    setMembers,
    setHomeError,
    joinRoom,
  ]);

  return { handleCreateRoom, handleJoinRoom };
}
