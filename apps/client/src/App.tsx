import { useState, useEffect } from "react";
import { socket } from "./socket";
import Landing from "./pages/Landing";
import Lobby from "./pages/Lobby";

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
    <div data-theme="forest">
      {/* <Landing /> */}
      <Lobby />
    </div>
  );
}

export default App;
