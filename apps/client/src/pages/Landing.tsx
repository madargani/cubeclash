import type { ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useGameActions, useNickname } from "@/hooks/useStore";
import { socket } from "@/socket";

interface LandingProps {}

function Landing({}: LandingProps) {
  const nickname = useNickname();
  const { setNickname, setMembers, setRoomId } = useGameActions();
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
        setMembers(members);
        navigate("lobby");
      });
    } else {
      // Create Room
      socket.emit("create_room", nickname, (roomId) => {
        setRoomId(roomId);
        navigate("lobby");
      });
    }
  };

  return (
    <main className="h-screen flex flex-col gap-4 justify-center items-center">
      <div className="w-full flex flex-row gap-4 justify-center items-center">
        <h1 className="font-sans text-7xl">CubeClash</h1>
        <div className="size-24 border-4 rounded-4xl"></div>
      </div>
      <input
        type="text"
        placeholder="Enter Name"
        className="input input-xl"
        value={nickname}
        onChange={handleNameChange}
      />
      <button className="btn btn-primary btn-xl" onClick={handleCreateAndJoin}>
        {params.roomId ? "Join Room" : "Create Room"}
      </button>
    </main>
  );
}

export default Landing;
