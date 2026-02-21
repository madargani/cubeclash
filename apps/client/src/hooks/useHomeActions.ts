import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useGameActions, useNickname, useRoomId } from "./useGameStore";
import { useSocketActions } from "./useSocketActions";

export function useHomeActions() {
  const nickname = useNickname();
  const roomId = useRoomId();
  const { setNickname, setMembers, setRoomId, setHostNickname } =
    useGameActions();
  const { createRoom, joinRoom } = useSocketActions();
  const navigate = useNavigate();

  const handleCreateRoom = useCallback(() => {
    if (!nickname) return;
    setHostNickname(nickname);
    createRoom(nickname, (roomId) => {
      setRoomId(roomId);
      setMembers([nickname]);
      navigate("/room");
    });
  }, [nickname, navigate, setNickname, setHostNickname, setRoomId, setMembers, createRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!nickname || !roomId) return;
    setHostNickname("");
    joinRoom(nickname, roomId, (members) => {
      if (!members) {
        return;
      }
      setMembers(members);
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
    joinRoom,
  ]);

  return { handleCreateRoom, handleJoinRoom };
}
