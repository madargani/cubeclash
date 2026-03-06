import {
  useLeaderboard,
  useScrambles,
  useNickname,
  useGameActions,
} from "@/hooks/useGameStore";
import { formatTime } from "@/lib/utils";
import { Text } from "../retroui/Text";
import { Table } from "../retroui/Table";
import { Button } from "../retroui/Button";

function formatSolves(rounds: (number | null)[]): string {
  const validTimes = rounds.filter((t): t is number => t !== null);
  if (validTimes.length === 0) return "--";

  // Get index of best and worst times
  // worst index is dnf if there is a dnf
  const best = validTimes.reduce((bestIndex, x, i) => {
    if (x > 0 && (bestIndex < 0 || x < validTimes[bestIndex])) return i;
    return bestIndex;
  }, -1);
  const worst = validTimes.indexOf(
    validTimes.some((x) => x < 0)
      ? Math.min(...validTimes)
      : Math.max(...validTimes),
  );
  console.log(best);

  return rounds
    .map((time, index) => {
      if (time === null) return "--";
      if (index === best) return `(${formatTime(time)})`;
      if (index === worst) return `(${formatTime(time)})`;
      return formatTime(time);
    })
    .join(" | ");
}

function Results() {
  const leaderboard = useLeaderboard();
  const scrambles = useScrambles();
  const nickname = useNickname();
  const { setStage } = useGameActions();

  // Find current user's entry in leaderboard
  const currentUser = leaderboard.find((entry) => entry.name === nickname);

  // Get top 5 placers
  const top5 = leaderboard.slice(0, 5);

  const handlePlayAgain = () => setStage("lobby");

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
              <Table.Head>Solves</Table.Head>
              <Table.Head>Average</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {top5.map((entry) => (
              <Table.Row key={entry.name}>
                <Table.Cell>{entry.rank}</Table.Cell>
                <Table.Cell>{entry.name}</Table.Cell>
                <Table.Cell className="text-sm">
                  {formatSolves(entry.rounds)}
                </Table.Cell>
                <Table.Cell>{formatTime(entry.average)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {/* Current User Stats with Solves */}
        {currentUser && (
          <div className="flex flex-col gap-2 w-full mt-4">
            <Text as="h2" className="text-xl">
              Your Stats
            </Text>
            <div className="flex gap-8 mb-4">
              <div>
                <Text className="text-sm opacity-70">Average</Text>
                <Text>{formatTime(currentUser.average)}</Text>
              </div>
              <div>
                <Text className="text-sm opacity-70">Best</Text>
                <Text>{formatTime(currentUser.best)}</Text>
              </div>
            </div>

            {scrambles.length > 0 && (
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
                      <Table.Cell className="max-w-48 truncate">
                        {scramble}
                      </Table.Cell>
                      <Table.Cell>
                        {formatTime(currentUser.rounds[idx])}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </div>
        )}

        <Button className="self-end" onClick={handlePlayAgain}>
          Play Again
        </Button>
      </div>
    </main>
  );
}

export default Results;
