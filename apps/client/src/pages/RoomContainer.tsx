import Leaderboard from "@/components/views/Leaderboard";
import Lobby from "@/components/views/Lobby";
import Timer from "@/components/views/Timer";
import { useGameStore, useRoomId } from "@/hooks/useGameStore";
import { useEffect } from "react";
import { useNavigate } from "react-router";

function RoomContainer() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const stage = useGameStore((state) => state.stage);

  useEffect(() => {
    if (!roomId) navigate("/");
  }, [navigate]);

  switch (stage) {
    case "lobby":
      return <Lobby />;
    case "timer":
      return <Timer />;
    case "leaderboard":
      return <Leaderboard />;
  }
}

export default RoomContainer;
