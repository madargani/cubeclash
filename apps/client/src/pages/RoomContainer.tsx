import Leaderboard from "@/components/views/Leaderboard";
import Lobby from "@/components/views/Lobby";
import Timer from "@/components/views/Timer";
import { useRoomState } from "@/hooks/useRoomStore";

function RoomContainer() {
  const roomState = useRoomState();

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
