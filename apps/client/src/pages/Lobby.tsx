import MemberList from "../components/MemberList";
import Settings from "../components/Settings";

function Lobby() {
  return (
    <main className="h-screen p-4 flex flex-col gap-4 items-end">
      <div className="w-full flex flex-row gap-4 justify-center items-center">
        <h1 className="font-sans text-5xl">CubeClash</h1>
        <div className="size-16 border-3 rounded-3xl"></div>
      </div>
      <div className="w-full flex flex-row flex-1 gap-4">
        <MemberList />
        <Settings />
      </div>
      <button className="btn btn-lg relative right-0 bg-primary text-primary-content">
        Start
      </button>
    </main>
  );
}

export default Lobby;
