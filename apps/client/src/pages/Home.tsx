import { Text } from "@/components/retroui/Text";
import CreateRoomButton from "@/components/home/CreateRoomButton";
import JoinRoomButton from "@/components/home/JoinRoomButton";

function Home() {
  return (
    <main className="h-screen flex flex-col gap-4 justify-center items-center">
      <div className="w-full flex flex-row gap-4 justify-center items-center">
        <Text as="h1">CubeClash</Text>
        <div className="size-10 border-4 rounded-xl"></div>
      </div>
      <CreateRoomButton />
      <JoinRoomButton />
    </main>
  );
}

export default Home;
