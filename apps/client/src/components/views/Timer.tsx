import { useRoomId, useScramble } from "@/hooks/useRoomStore";
import useStackmat from "@/hooks/useStackmat";
import { socket } from "@/socket";
import { useEffect } from "react";

function Timer() {
  const scramble = useScramble();
  const { state, display, finalTime, handleHandsDown, handleHandsUp } =
    useStackmat();
  const roomId = useRoomId();

  useEffect(() => {
    if (state == "STOPPED") {
      socket.emit("submit_solve", roomId, finalTime);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code == "Space" && !e.repeat) handleHandsDown();
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code == "Space" && !e.repeat) handleHandsUp();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [state]);

  return (
    <main className="h-screen p-4 flex flex-col">
      <p className="text-xl text-center">{scramble}</p>
      <div className="flex-1 flex flex-col justify-center">
        <p
          className={`text-9xl text-center 
            ${state == "PRIMING" && "text-warning"} 
            ${state == "READY" && "text-success"}`}
        >
          {display}
        </p>
      </div>
    </main>
  );
}

export default Timer;
