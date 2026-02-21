import { useEffect } from "react";
import { socket } from "@/socket";
import Home from "@/pages/Home";
import RoomContainer from "@/pages/RoomContainer";
import { BrowserRouter, Route, Routes } from "react-router";
import { useGameActions } from "@/hooks/useGameStore";

function App() {
  const {
    addMember,
    setGameState,
    setScramble,
    setLeaderboard,
    setCurrentRound,
  } = useGameActions();

  useEffect(() => {
    // Someone joined room
    socket.on("member_joined", (nickname) => {
      addMember(nickname);
    });

    // Start new round
    socket.on("start_round", (scramble, round) => {
      setGameState("timer");
      setScramble(scramble);
      setCurrentRound(round);
    });

    // Round completed - show leaderboard
    socket.on("round_done", (leaderboard) => {
      setLeaderboard(leaderboard);
      setGameState("leaderBoard");
    });

    return () => {
      socket.off("member_joined");
      socket.off("start_round");
      socket.off("round_done");
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="room" element={<RoomContainer />} />
        <Route path=":roomId?" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
