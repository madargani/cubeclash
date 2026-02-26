import { useLeaderboard, useScrambles, useNickname } from "@/hooks/useGameStore";
import { formatTime } from "@/lib/utils";
import { useRoom } from "@/hooks/useRoom";
import { Text } from "../retroui/Text";
import { Table } from "../retroui/Table";
import { Button } from "../retroui/Button";

function Results() {
  const leaderboard = useLeaderboard();
  const scrambles = useScrambles();
  const nickname = useNickname();
  const { resetGame } = useRoom();

  // Find current user's entry in leaderboard
  const currentUser = leaderboard.find((entry) => entry.name === nickname);

  // Get top 5 placers
  const top5 = leaderboard.slice(0, 5);

  const handlePlayAgain = () => {
    resetGame();
  };

  return (
    <main className="h-screen flex items-center justify-center">
      <div className="h-fit p-8 md:min-w-200 flex flex-col gap-4 items-center justify-center">
        <Text as="h1">Results</Text>

        {/* Top 5 Leaderboard */}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Rank</Table.Head>
              <Table.Head>Name</Table.Head>
              <Table.Head>Average</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {top5.map((entry) => (
              <Table.Row key={entry.name}>
                <Table.Cell>{entry.rank}</Table.Cell>
                <Table.Cell>{entry.name}</Table.Cell>
                <Table.Cell>{formatTime(entry.average)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {/* Current User Stats */}
        {currentUser && (
          <div className="flex flex-col gap-2 w-full mt-4">
            <Text as="h2" className="text-xl">Your Stats</Text>
            <div className="flex gap-8">
              <div>
                <Text className="text-sm opacity-70">Average</Text>
                <Text>{formatTime(currentUser.average)}</Text>
              </div>
              <div>
                <Text className="text-sm opacity-70">Best</Text>
                <Text>{formatTime(currentUser.best)}</Text>
              </div>
            </div>
          </div>
        )}

        {/* Scrambles with User Times */}
        {scrambles.length > 0 && currentUser && (
          <div className="flex flex-col gap-2 w-full mt-4">
            <Text as="h2" className="text-xl">Your Solves</Text>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Round</Table.Head>
                  <Table.Head>Scramble</Table.Head>
                  <Table.Head>Time</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {scrambles.map((scramble, idx) => (
                  <Table.Row key={idx}>
                    <Table.Cell>{idx + 1}</Table.Cell>
                    <Table.Cell className="max-w-48 truncate">{scramble}</Table.Cell>
                    <Table.Cell>{formatTime(currentUser.rounds[idx])}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}

        <Button onClick={handlePlayAgain}>Play Again</Button>
      </div>
    </main>
  );
}

export default Results;
