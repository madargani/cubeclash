import {
  useGameStore,
  useLeaderboard,
  useRoomId,
  useCurrentRound,
} from "@/hooks/useGameStore";
import { formatTime } from "@/lib/utils";
import { socket } from "@/socket";
import { Text } from "../retroui/Text";
import { Table } from "../retroui/Table";
import { Button } from "../retroui/Button";

function Leaderboard() {
  const leaderboard = useLeaderboard();
  const hostNickname = useGameStore((state) => state.hostNickname);
  const roomId = useRoomId();
  const currentRound = useCurrentRound();

  const handleNextRound = () => {
    socket.emit("next_round", roomId);
  };

  const buttonText = currentRound === 3 ? "Final Round" : "Next Round";

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
        {hostNickname !== "" && currentRound < 4 && (
          <Button className="self-end" onClick={handleNextRound}>
            {buttonText}
          </Button>
        )}
      </div>
    </main>
  );
}

export default Leaderboard;
