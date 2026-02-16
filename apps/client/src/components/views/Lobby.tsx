import MemberList from "@/components/MemberList";
import Settings from "@/components/Settings";
import { useIsHost, useRoomId } from "@/hooks/useRoomStore";
import { socket } from "@/socket";

function Lobby() {
  const roomId = useRoomId();
  const isHost = useIsHost();

  const handleStart = () => {
    socket.emit("start_game", roomId);
  };

  return (
    <main className="h-screen p-4 flex flex-col gap-4 items-end">
      <div className="w-full flex flex-row gap-4 justify-center items-center">
        <h1 className="text-5xl">CubeClash</h1>
        <div className="size-16 border-3 rounded-3xl"></div>
      </div>
      <div className="w-full flex flex-row flex-1 gap-4">
        <MemberList />
        <Settings />
      </div>
      {isHost && (
        <button
          className="btn btn-lg bg-primary text-primary-content"
          onClick={handleStart}
        >
          Start
        </button>
      )}
    </main>
  );
}

export default Lobby;
