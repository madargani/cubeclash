import { useEffect } from "react";
import { socket } from "@/socket";
import Home from "@/pages/Home";
import RoomContainer from "@/pages/RoomContainer";
import { BrowserRouter, Route, Routes } from "react-router";
import { useGameActions } from "@/hooks/useGameStore";

function App() {
  const { addMember, setStage, addScramble, setLeaderboard, setCurrentRound } =
    useGameActions();

  useEffect(() => {
    // Someone joined room
    socket.on("member_joined", (nickname) => {
      addMember(nickname);
    });

    // Start new round
    socket.on("start_round", (scramble, round) => {
      setStage("timer");
      addScramble(scramble);
      setCurrentRound(round);
    });

    // Round completed - show leaderboard
    socket.on("round_done", (leaderboard) => {
      setLeaderboard(leaderboard);
      setStage("leaderboard");
    });

    return () => {
      socket.off("member_joined");
      socket.off("start_round");
      socket.off("round_done");
    };
  }, [addMember, setStage, addScramble, setLeaderboard, setCurrentRound]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="" element={<Home />} />
        <Route path="room" element={<RoomContainer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
