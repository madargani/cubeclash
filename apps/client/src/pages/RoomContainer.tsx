import Leaderboard from "@/components/views/Leaderboard";
import Lobby from "@/components/views/Lobby";
import Timer from "@/components/views/Timer";
import { useGameState, useRoomId } from "@/hooks/useGameStore";
import { useEffect } from "react";
import { useNavigate } from "react-router";

function RoomContainer() {
  const roomId = useRoomId();
  const navigate = useNavigate();
  const roomState = useGameState();

  useEffect(() => {
    if (!roomId) navigate("/");
  }, [navigate]);

  switch (roomState) {
    case "lobby":
      return <Lobby />;
    case "timer":
      return <Timer />;
    case "leaderBoard":
      return <Leaderboard />;
  }
}

export default RoomContainer;
