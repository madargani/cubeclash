import type { ChangeEvent, KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useRoomActions, useNickname } from "@/hooks/useRoomStore";
import { socket } from "@/socket";

interface LandingProps {}

function Landing({}: LandingProps) {
  const nickname = useNickname();
  const { setNickname, setMembers, setRoomId } = useRoomActions();
  const params = useParams();

  const navigate = useNavigate();

  // Called when name is changed
  // Removes non-alphanumeric characters
  // Limits nickname to 10 characters
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const validated = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
    if (validated.length > 10) return;
    setNickname(validated);
  };

  // Called when a key is pressed in the input
  // Triggers join/create when Enter is pressed
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCreateAndJoin();
    }
  };

  const handleCreateAndJoin = () => {
    // Validate input
    if (!nickname) return;

    if (params.roomId) {
      // Join Room
      socket.emit("join_room", nickname, params.roomId, (members) => {
        if (!members) {
          // Failed to Join Room
          // TODO:Show join room error
          return;
        }
        setRoomId(params.roomId!);
        setMembers(members);
        navigate("/room");
      });
    } else {
      // Create Room
      socket.emit("create_room", nickname, (roomId) => {
        setRoomId(roomId);
        setMembers([nickname]);
        navigate("/room");
      });
    }
  };

  return (
    <main className="h-screen flex flex-col gap-4 justify-center items-center">
      <div className="w-full flex flex-row gap-4 justify-center items-center">
        <h1 className="text-7xl">CubeClash</h1>
        <div className="size-24 border-4 rounded-4xl"></div>
      </div>
      <input
        type="text"
        placeholder="Enter Name"
        className="input input-xl"
        value={nickname}
        onChange={handleNameChange}
        onKeyDown={handleKeyDown}
      />
      <button className="btn btn-primary btn-xl" onClick={handleCreateAndJoin}>
        {params.roomId ? "Join Room" : "Create Room"}
      </button>
    </main>
  );
}

export default Landing;
