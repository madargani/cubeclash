import MemberList from "@/components/lobby/MemberList";
import Settings from "@/components/lobby/Settings";
import { useIsHost } from "@/hooks/useGameStore";
import { useSocketActions } from "@/hooks/useSocketActions";
import { Text } from "@/components/retroui/Text";
import { Button } from "../retroui/Button";

function Lobby() {
  const isHost = useIsHost();
  const { startGame } = useSocketActions();

  return (
    <main className="h-screen flex justify-center">
      <div className="p-8 md:min-w-200 h-screen flex flex-col gap-4 items-stretch justify-start md:justify-center overflow-hidden">
        <div className="w-full flex flex-row gap-4 justify-center items-center">
          <Text as="h1">CubeClash</Text>
          <div className="size-10 border-4 rounded-xl"></div>
        </div>
        <div className="flex flex-col max-h-200 md:flex-row flex-1 gap-4 overflow-hidden">
          <MemberList />
          <Settings />
        </div>
        {isHost && (
          <Button onClick={startGame} className="self-end">
            Start
          </Button>
        )}
      </div>
    </main>
  );
}

export default Lobby;
