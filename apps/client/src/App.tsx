import { useState, useEffect } from "react";
import "./App.css";
import { socket } from "./socket";

function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  const handleJoin = () => {
    if (roomId.trim()) {
      socket.emit("room:join", roomId);
      setJoined(true);
    }
  };

  return (
    <div className="app">
      <h1>JOIN ROOM</h1>
      <p>Status: {connected ? "Connected" : "Disconnected"}</p>
      <input
        inputMode="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={handleJoin}>{joined ? "Joined" : "Join Room"}</button>
    </div>
  );
}

export default App;
