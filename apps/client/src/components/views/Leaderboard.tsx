import { useIsHost, useLeaderboard, useRoomId, useCurrentRound } from "@/hooks/useRoomStore";
import { socket } from "@/socket";
import type { LeaderboardEntry } from "@cubeclash/types";

function Leaderboard() {
  const leaderboard = useLeaderboard();
  const isHost = useIsHost();
  const roomId = useRoomId();
  const currentRound = useCurrentRound();

  const handleNextRound = () => {
    socket.emit("next_round", roomId);
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--";

    if (seconds < 60) {
      // Less than 1 minute: show as SS.XX
      return seconds.toFixed(2);
    } else {
      // 1 minute or more: show as M:SS.XX
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, "0")}`;
    }
  };

  const buttonText = currentRound === 3 ? "Final Round" : "Next Round";

  return (
    <main className="h-screen p-4 flex flex-col gap-4 items-end">
      <div className="w-full flex flex-col gap-4 justify-center items-center flex-1">
        <h1 className="text-5xl">Leaderboard</h1>
        <div className="w-full max-w-4xl overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="text-center">Rank</th>
                <th>Name</th>
                <th className="text-center">R1</th>
                <th className="text-center">R2</th>
                <th className="text-center">R3</th>
                <th className="text-center">R4</th>
                <th className="text-center">R5</th>
                <th className="text-center">Average</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry: LeaderboardEntry) => (
                <tr key={entry.name}>
                  <td className="text-center font-bold">{entry.rank}</td>
                  <td>{entry.name}</td>
                  {entry.rounds.map((time, idx) => (
                    <td key={idx} className="text-center font-mono">
                      {formatTime(time)}
                    </td>
                  ))}
                  <td className="text-center font-mono font-bold">
                    {formatTime(entry.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isHost && currentRound < 4 && (
        <button
          className="btn btn-lg bg-primary text-primary-content"
          onClick={handleNextRound}
        >
          {buttonText}
        </button>
      )}
    </main>
  );
}

export default Leaderboard;
