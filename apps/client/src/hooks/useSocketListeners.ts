import { useEffect, useMemo } from "react";
import { socket } from "@/socket";
import type { ServerToClientEvents, LeaderboardEntry } from "@cubeclash/types";

type SocketEventHandlers = {
  onMemberJoined?: (nickname: string) => void;
  onMemberLeft?: (nickname: string) => void;
  onStartRound?: (scramble: string, round: number) => void;
  onRoundDone?: (leaderboard: LeaderboardEntry[]) => void;
  onGameOver?: (leaderboard: LeaderboardEntry[]) => void;
};

export function useSocketListeners(handlers: SocketEventHandlers) {
  const stableHandlers = useMemo(() => handlers, [handlers]);

  useEffect(() => {
    if (!stableHandlers.onMemberJoined) return;
    const handler: ServerToClientEvents["member_joined"] = (nickname) => {
      stableHandlers.onMemberJoined?.(nickname);
    };
    socket.on("member_joined", handler);
    return () => {
      socket.off("member_joined", handler);
    };
  }, [stableHandlers.onMemberJoined]);

  useEffect(() => {
    if (!stableHandlers.onMemberLeft) return;
    const handler: ServerToClientEvents["member_left"] = (nickname) => {
      stableHandlers.onMemberLeft?.(nickname);
    };
    socket.on("member_left", handler);
    return () => {
      socket.off("member_left", handler);
    };
  }, [stableHandlers.onMemberLeft]);

  useEffect(() => {
    if (!stableHandlers.onStartRound) return;
    const handler: ServerToClientEvents["start_round"] = (scramble, round) => {
      stableHandlers.onStartRound?.(scramble, round);
    };
    socket.on("start_round", handler);
    return () => {
      socket.off("start_round", handler);
    };
  }, [stableHandlers.onStartRound]);

  useEffect(() => {
    if (!stableHandlers.onRoundDone) return;
    const handler: ServerToClientEvents["round_done"] = (leaderboard) => {
      stableHandlers.onRoundDone?.(leaderboard);
    };
    socket.on("round_done", handler);
    return () => {
      socket.off("round_done", handler);
    };
  }, [stableHandlers.onRoundDone]);

  useEffect(() => {
    if (!stableHandlers.onGameOver) return;
    const handler: ServerToClientEvents["game_over"] = (leaderboard) => {
      stableHandlers.onGameOver?.(leaderboard);
    };
    socket.on("game_over", handler);
    return () => {
      socket.off("game_over", handler);
    };
  }, [stableHandlers.onGameOver]);
}
