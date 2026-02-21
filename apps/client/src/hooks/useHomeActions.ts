import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useRoomActions } from "./useRoomStore";
import { socket } from "@/socket";

export function useHomeActions() {
  const { setNickname, setMembers, setRoomId, setIsHost } = useRoomActions();
  const navigate = useNavigate();

  const handleCreateRoom = useCallback(
    (nickname: string) => {
      if (!nickname) return;
      setIsHost(true);
      socket.emit("create_room", nickname, (roomId) => {
        setRoomId(roomId);
        setMembers([nickname]);
        navigate("/room");
      });
    },
    [navigate, setNickname, setIsHost, setRoomId, setMembers],
  );

  const handleJoinRoom = useCallback(
    (nickname: string, roomId: string) => {
      if (!nickname || !roomId) return;
      setIsHost(false);
      socket.emit("join_room", nickname, roomId, (members) => {
        if (!members) {
          // TODO: Show join room error
          return;
        }
        setRoomId(roomId);
        setMembers(members);
        navigate("/room");
      });
    },
    [navigate, setNickname, setIsHost, setRoomId, setMembers],
  );

  return { handleCreateRoom, handleJoinRoom };
}
