import { useLeaderboard, useCurrentRound, useIsHost, useSettings } from "@/hooks/useGameStore";
import { formatTime } from "@/lib/utils";
import { useSocketActions } from "@/hooks/useSocketActions";
import { Text } from "../retroui/Text";
import { Table } from "../retroui/Table";
import { Button } from "../retroui/Button";

function Leaderboard() {
  const leaderboard = useLeaderboard();
  const isHost = useIsHost();
  const currentRound = useCurrentRound();
  const settings = useSettings();
  const { nextRound } = useSocketActions();

  const buttonText =
    currentRound === settings.rounds - 2 ? "Final Round" : "Next Round";

  return (
    <main className="h-screen flex items-center justify-center">
      <div className="h-fit p-8 md:min-w-200 flex flex-col gap-4 items-center justify-center">
        <Text as="h1">Leaderboard</Text>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Rank</Table.Head>
              <Table.Head>Name</Table.Head>
              <Table.Head>R1</Table.Head>
              <Table.Head>R2</Table.Head>
              <Table.Head>R3</Table.Head>
              <Table.Head>R4</Table.Head>
              <Table.Head>R5</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {leaderboard.map((entry) => (
              <Table.Row key={entry.name}>
                <Table.Cell>{entry.rank}</Table.Cell>
                <Table.Cell>{entry.name}</Table.Cell>
                {entry.rounds.map((time, idx) => (
                  <Table.Cell key={idx}>{formatTime(time)}</Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {isHost && currentRound < settings.rounds - 1 && (
          <Button className="self-end" onClick={nextRound}>
            {buttonText}
          </Button>
        )}
      </div>
    </main>
  );
}

export default Leaderboard;
