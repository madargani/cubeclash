import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useGameActions, useNickname, useRoomId } from "./useGameStore";
import { socket } from "@/socket";

export function useHomeActions() {
  const nickname = useNickname();
  const roomId = useRoomId();
  const { setNickname, setMembers, setRoomId, setHostNickname } =
    useGameActions();
  const navigate = useNavigate();

  const handleCreateRoom = useCallback(() => {
    if (!nickname) return;
    setHostNickname(nickname);
    socket.emit("create_room", nickname, (roomId) => {
      setRoomId(roomId);
      setMembers([nickname]);
      navigate("/room");
    });
  }, [nickname, navigate, setNickname, setHostNickname, setRoomId, setMembers]);

  const handleJoinRoom = useCallback(() => {
    if (!nickname || !roomId) return;
    setHostNickname("");
    socket.emit("join_room", nickname, roomId, (members) => {
      if (!members) {
        // TODO: Show join room error
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
  ]);

  return { handleCreateRoom, handleJoinRoom };
}
