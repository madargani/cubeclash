import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { ServerToClientEvents } from "@cubeclash/types";
import { socket } from "@/socket";
import { clearRoomSession, loadRoomSession } from "@/lib/roomSession";
import { useGameActions } from "./useGameStore";
import { useSocketActions } from "./useSocketActions";

// Tracks whether this client currently holds a live room binding. Set after a
// successful create/join/rejoin ack, cleared on socket disconnect (design D4).
let roomBound = false;

export function markRoomBound() {
  roomBound = true;
}

export function markRoomUnbound() {
  roomBound = false;
}

export function useRoomSync() {
  const { setRoom, setMemberId, setNickname, setHomeError } = useGameActions();
  const { rejoinRoom } = useSocketActions();
  const navigate = useNavigate();

  useEffect(() => {
    const onRoomState: ServerToClientEvents["room_state"] = (snapshot) => {
      setRoom(snapshot);
    };

    const onDisconnect = () => {
      markRoomUnbound();
    };

    const onConnect = () => {
      if (roomBound) return;

      const session = loadRoomSession();
      if (!session) return;

      rejoinRoom(session.roomId, session.memberId, (response) => {
        if (response.status === "success") {
          markRoomBound();
          setMemberId(session.memberId);
          setNickname(session.nickname);
          navigate("/room");
          return;
        }

        if (response.message === "Already connected") {
          // Another tab owns this member; keep the credentials so a later
          // reload can rejoin once that tab is gone (design D4).
          setHomeError(response.message);
          return;
        }

        // Room deleted or member unknown: stale credentials.
        clearRoomSession();
      });
    };

    socket.on("room_state", onRoomState);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);

    return () => {
      socket.off("room_state", onRoomState);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [navigate, rejoinRoom, setHomeError, setMemberId, setNickname, setRoom]);
}
