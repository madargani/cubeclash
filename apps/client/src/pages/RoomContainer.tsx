import Lobby from "@/components/views/Lobby";
import Timer from "@/components/views/Timer";
import { useRoomState } from "@/hooks/useStore";

function RoomContainer() {
  const roomState = useRoomState();

  switch (roomState) {
    case "lobby":
      return <Lobby />;
    case "timer":
      return <Timer />;
    case "leaderBoard":
      // TODO: implement leaderboard
      return <div>Leaderboard</div>;
  }
}

export default RoomContainer;
