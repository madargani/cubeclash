import { useState } from "react";
import { Button } from "../retroui/Button";
import { Dialog } from "../retroui/Dialog";
import { Input } from "../retroui/Input";
import { Text } from "../retroui/Text";
import { useHomeActions } from "@/hooks/useHomeActions";

function CreateRoomButton() {
  const [nickname, setNickname] = useState("");
  const { handleCreateRoom } = useHomeActions();

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
            <label htmlFor="name">Nickname</label>
            <Input
              placeholder="Enter a nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
        </div>
        <Dialog.Footer>
          <Dialog.Trigger asChild>
            <Button onClick={() => handleCreateRoom(nickname)}>Create</Button>
          </Dialog.Trigger>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export default CreateRoomButton;
