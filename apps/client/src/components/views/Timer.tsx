import { useScramble } from "@/hooks/useStore";

function Timer() {
  const scramble = useScramble();

  return (
    <main className="h-screen p-4 flex flex-col">
      <p className="text-xl text-center">{scramble}</p>
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-9xl text-center">0.00</p>
      </div>
    </main>
  );
}

export default Timer;
