import { Button } from "../retroui/Button";
import { Dialog } from "../retroui/Dialog";
import { Input } from "../retroui/Input";
import { Text } from "../retroui/Text";
import { useHomeActions } from "@/hooks/useHomeActions";
import { useRandomUsername } from "@/hooks/useRandomUsername";
import { Label } from "../retroui/Label";
import {
  useGameActions,
  useNickname,
  useHomeError,
} from "@/hooks/useGameStore";

function CreateRoomButton() {
  const nickname = useNickname();
  const homeError = useHomeError();
  const { setNickname } = useGameActions();
  const { handleCreateRoom } = useHomeActions();
  const randomPlaceholder = useRandomUsername();

  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button>Create Room</Button>
      </Dialog.Trigger>
      <Dialog.Content size={"auto"}>
        <Dialog.Header>
          <Text as="h5">Create Room</Text>
        </Dialog.Header>
        <div className="flex flex-col p-4 gap-4">
          <div className="flex-col gap-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              placeholder={randomPlaceholder}
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          {homeError && (
            <Text className="text-red-500 text-sm">{homeError}</Text>
          )}
        </div>
        <Dialog.Footer>
          <Button onClick={() => handleCreateRoom(randomPlaceholder)}>Create</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export default CreateRoomButton;
