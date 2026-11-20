import Results from "@/components/views/Results";

import Leaderboard from "@/components/views/Leaderboard";
import Lobby from "@/components/views/Lobby";
import Timer from "@/components/views/Timer";
import { useRoomSnapshot } from "@/hooks/useGameStore";
import { useEffect } from "react";
import { useNavigate } from "react-router";

function RoomContainer() {
  const room = useRoomSnapshot();
  const navigate = useNavigate();

  useEffect(() => {
    if (!room) navigate("/");
  }, [room, navigate]);

  if (!room) return null;

  switch (room.phase) {
    case "lobby":
      return <Lobby />;
    case "solving":
      return <Timer />;
    case "round_done":
      return <Leaderboard />;
    case "game_over":
      return <Results />;
  }
}

export default RoomContainer;
