import { useEffect } from "react";
import { socket } from "@/socket";
import Landing from "@/pages/Landing";
import RoomContainer from "@/pages/RoomContainer";
import { BrowserRouter, Route, Routes } from "react-router";
import { useGameActions } from "@/hooks/useStore";

function App() {
  const { addMember } = useGameActions();

  useEffect(() => {
    // Someone joined room
    socket.on("member_joined", (nickname) => {
      addMember(nickname);
    });

    return () => {
      socket.off("member_joined");
    };
  }, []);

  return (
    <div data-theme="forest" className="font-azeret-mono">
      <BrowserRouter>
        <Routes>
          <Route path=":roomId?" element={<Landing />} />
          <Route path="room" element={<RoomContainer />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
