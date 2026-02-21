import MemberList from "@/components/lobby/MemberList";
import Settings from "@/components/lobby/Settings";
import { useIsHost, useRoomId } from "@/hooks/useGameStore";
import { socket } from "@/socket";
import { Text } from "@/components/retroui/Text";
import { Button } from "../retroui/Button";

function Lobby() {
  const roomId = useRoomId();
  const isHost = useIsHost();

  const handleStart = () => {
    socket.emit("start_game", roomId);
  };

  return (
    <main className="h-screen flex justify-center">
      <div className="p-8 md:min-w-200 flex flex-col gap-4 items-stretch justify-center">
        <div className="w-full flex flex-row gap-4 justify-center items-center">
          <Text as="h1">CubeClash</Text>
          <div className="size-10 border-4 rounded-xl"></div>
        </div>
        <div className="max-h-200 flex flex-col md:flex-row flex-1 gap-4">
          <MemberList />
          <Settings />
        </div>
        {isHost && (
          <Button onClick={handleStart} className="self-end">
            Start
          </Button>
        )}
      </div>
    </main>
  );
}

export default Lobby;
