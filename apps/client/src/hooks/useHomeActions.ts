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

  const handleCreateRoom = useCallback(() => {
    if (!nickname) return;
    setHostNickname(nickname);
    setHomeError(null);
    createRoom(nickname, (response) => {
      if (response.status === "error") {
        setHomeError(response.message);
        return;
      }
      setRoomId(response.data);
      setMembers([nickname]);
      navigate("/room");
    });
  }, [nickname, navigate, setNickname, setHostNickname, setRoomId, setMembers, setHomeError, createRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!nickname || !roomId) return;
    setHostNickname("");
    setHomeError(null);
    joinRoom(nickname, roomId, (response) => {
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
