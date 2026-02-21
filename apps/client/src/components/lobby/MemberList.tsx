import { useMembers } from "@/hooks/useGameStore";
import { Text } from "@/components/retroui/Text";
import { Card } from "@/components/retroui/Card";

function MemberList() {
  const members = useMembers();

  return (
    <div className="md:flex-1 flex flex-col gap-4">
      <Text as="h3" className="text-center hidden md:block">
        Speed Cubers
      </Text>
      <ul className="flex flex-row md:flex-col gap-4">
        {members.map((nickname, index) => (
          <li key={`User ${index}`} className="">
            <Card className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="size-8 border-3 rounded-lg"></div>
              <Text className="flex-1">{nickname}</Text>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MemberList;
