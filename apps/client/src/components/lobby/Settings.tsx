import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { Label } from "../retroui/Label";
import { Select } from "../retroui/Select";
import { Input } from "../retroui/Input";
import { Badge } from "../retroui/Badge";
import { useRoomId } from "@/hooks/useGameStore";

function Settings() {
  const roomId = useRoomId();
  return (
    <Card className="flex flex-col gap-4 flex-1 w-full p-8 overflow-y-auto">
      <div>
        <Text as="h3" className="text-center">
          Room Settings
        </Text>
      </div>
      <ul className="flex flex-col gap-8">
        {/* Room ID */}
        <li className="flex flex-col">
          <div className="flex flex-col gap-4">
            <Label>Room ID</Label>
            <Badge>{roomId}</Badge>
          </div>
        </li>

        <li className="flex flex-col">
          <div className="flex flex-col gap-4">
            <Label>Event</Label>
            <Select defaultValue="3x3">
              <Select.Trigger>
                <Select.Value></Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Item value="3x3">3x3</Select.Item>
                  <Select.Item value="4x4">4x4</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select>
          </div>
        </li>

        <li>
          <div className="flex flex-col gap-4">
            <Label>Rounds</Label>
            <Select defaultValue="5">
              <Select.Trigger>
                <Select.Value></Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Item value="5">5</Select.Item>
                  <Select.Item value="12">12</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select>
          </div>
        </li>

        <li>
          <div className="flex flex-col gap-4">
            <Label>Scramble + Inspection Time</Label>
            <Input
              type="number"
              defaultValue={60}
              placeholder="Enter time in seconds"
            />
          </div>
        </li>
      </ul>
    </Card>
  );
}

export default Settings;
