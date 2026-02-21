import MemberList from "@/components/lobby/MemberList";
import Settings from "@/components/lobby/Settings";
import { useGameStore, useRoomId } from "@/hooks/useGameStore";
import { useRoom } from "@/hooks/useRoom";
import { Text } from "@/components/retroui/Text";
import { Button } from "../retroui/Button";

function Lobby() {
  const roomId = useRoomId();
  const hostNickname = useGameStore((state) => state.hostNickname);
  const { startGame } = useRoom();

  const handleStart = () => {
    startGame(roomId);
  };

  return (
    <main className="h-screen flex justify-center">
      <div className="p-8 md:min-w-200 h-screen flex flex-col gap-4 items-stretch justify-start md:justify-center overflow-hidden">
        <div className="w-full flex flex-row gap-4 justify-center items-center">
          <Text as="h1">CubeClash</Text>
          <div className="size-10 border-4 rounded-xl"></div>
        </div>
        <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden">
          <MemberList />
          <Settings />
        </div>
        {hostNickname !== "" && (
          <Button onClick={handleStart} className="self-end">
            Start
          </Button>
        )}
      </div>
    </main>
  );
}

export default Lobby;
