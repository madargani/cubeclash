import { useMemo } from "react";
import { useSocketListeners } from "./useSocketListeners";
import { useSocketActions } from "./useSocketActions";
import { useGameActions } from "./useGameStore";
import type { RoomSettings } from "@cubeclash/types";

export function useRoom() {
  const {
    addMember,
    removeMember,
    setStage,
    addScramble,
    setLeaderboard,
    setCurrentRound,
    clearScrambles,
    setScrambles,
    setSettings,
  } = useGameActions();
  const actions = useSocketActions();

  const handlers = useMemo(
    () => ({
      onMemberJoined: addMember,
      onMemberLeft: removeMember,
      onStartRound: (scramble: string, round: number) => {
        setStage("timer");
        if (round === 0) clearScrambles();
        addScramble(scramble);
        setCurrentRound(round);
      },
      onRoundDone: (
        leaderboard: import("@cubeclash/types").LeaderboardEntry[],
      ) => {
        setLeaderboard(leaderboard);
        setStage("leaderboard");
      },
      onGameOver: (
        leaderboard: import("@cubeclash/types").LeaderboardEntry[],
        scrambles: string[],
      ) => {
        setLeaderboard(leaderboard);
        setScrambles(scrambles);
        setStage("results");
      },
      onSettingsChanged: (settings: RoomSettings) => {
        setSettings(settings);
      },
    }),
    [
      addMember,
      removeMember,
      setStage,
      addScramble,
      setLeaderboard,
      setCurrentRound,
      clearScrambles,
      setScrambles,
      setSettings,
    ],
  );

  useSocketListeners(handlers);

  return { ...actions };
}
