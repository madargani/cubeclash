import { useEffect } from "react";
import { socket } from "@/socket";
import Landing from "@/pages/Landing";
import RoomContainer from "@/pages/RoomContainer";
import { BrowserRouter, Route, Routes } from "react-router";
import { useRoomActions } from "@/hooks/useRoomStore";

function App() {
  const { addMember, setRoomState, setScramble } = useRoomActions();

  useEffect(() => {
    // Someone joined room
    socket.on("member_joined", (nickname) => {
      addMember(nickname);
    });

    // Start new round
    socket.on("start_round", (scramble) => {
      setRoomState("timer");
      setScramble(scramble);
    });

    return () => {
      socket.off("member_joined");
      socket.off("start_round");
    };
  }, []);

  return (
    <div data-theme="forest" className="font-azeret-mono">
      <BrowserRouter>
        <Routes>
          <Route path="room" element={<RoomContainer />} />
          <Route path=":roomId?" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
