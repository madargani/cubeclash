import { useMemo } from "react";
import { useSocketListeners } from "./useSocketListeners";
import { useSocketActions } from "./useSocketActions";
import { useGameActions } from "./useGameStore";

export function useRoom() {
  const { addMember, removeMember, setStage, addScramble, setLeaderboard, setCurrentRound } =
    useGameActions();
  const actions = useSocketActions();

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
    }),
    [addMember, removeMember, setStage, addScramble, setLeaderboard, setCurrentRound],
  );

  useSocketListeners(handlers);

  return actions;
}
