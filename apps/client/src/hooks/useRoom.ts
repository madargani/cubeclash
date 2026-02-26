import { useMemo } from "react";
import { useSocketListeners } from "./useSocketListeners";
import { useSocketActions } from "./useSocketActions";
import { useGameActions, useRoomId } from "./useGameStore";

export function useRoom() {
  const { addMember, removeMember, setStage, addScramble, setLeaderboard, setCurrentRound, setScrambles, resetGameState } =
    useGameActions();
  const actions = useSocketActions();
  const roomId = useRoomId();

  const handlers = useMemo(
    () => ({
      onMemberJoined: addMember,
      onMemberLeft: removeMember,
      onStartRound: (scramble: string, round: number) => {
        setStage("timer");
        addScramble(scramble);
        setCurrentRound(round);
      },
      onRoundDone: (leaderboard: import("@cubeclash/types").LeaderboardEntry[]) => {
        setLeaderboard(leaderboard);
        setStage("leaderboard");
      },
      onGameOver: (leaderboard: import("@cubeclash/types").LeaderboardEntry[], scrambles: string[]) => {
        setLeaderboard(leaderboard);
        setScrambles(scrambles);
        setStage("results");
      },
    }),
    [addMember, removeMember, setStage, addScramble, setLeaderboard, setCurrentRound, setScrambles, resetGameState],
  );

  useSocketListeners(handlers);

  const resetGame = () => {
    actions.resetGame(roomId);
    resetGameState();
  };

  return { ...actions, resetGame };
}
