import { useState, useEffect } from "react";
import { socket } from "./socket";

function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Successfully created and joined room
    socket.on("room:created", (roomId) => {
      setRoomId(roomId);
      setJoined(true);
      setIsHost(true);
      setMembers([socket.id as string]);
    });

    // Successfully joined room
    socket.on("room:joined", (roomId, members) => {
      setRoomId(roomId);
      setJoined(true);
      setMembers(members);
    });

    // Fail to join room
    socket.on("room:error", (error) => {
      setError(error);
    });

    // Someone joined room
    socket.on("user:joined", (userId) => {
      setMembers((prev) => [...prev, userId]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:created");
      socket.off("room:joined");
      socket.off("room:error");
      socket.off("user:joined");
    };
  }, []);

  const handleCreateRoom = () => {
    socket.emit("room:create");
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      socket.emit("room:join", roomId);
    }
  };

  return (
    <div className="app">
      <h1 className="text-xl">CubeClash</h1>
      <p>{connected ? "Connected" : "Disconnected"}</p>
      {joined && <p>Room {roomId}</p>}
      {isHost && <p>You are the host</p>}
      <ol>
        {members.map((member, index) => (
          <li key={index}>
            {index}: {member}
          </li>
        ))}
      </ol>
      <div>
        <button onClick={handleCreateRoom}>Create Room</button>
      </div>
      <div>
        <input
          inputMode="text"
          maxLength={8}
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
        />
        <button onClick={handleJoinRoom}>Join Room</button>
      </div>
      {error && <p>{error}</p>}
    </div>
  );
}

export default App;
