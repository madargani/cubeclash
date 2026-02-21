import { useCallback, useEffect } from "react";
import { useRoomId, useCurrentScramble } from "@/hooks/useGameStore";
import useStackmat from "@/hooks/useStackmat";
import { socket } from "@/socket";
import { Text } from "../retroui/Text";

function Timer() {
  const scramble = useCurrentScramble();
  const { state, display, finalTime, handleHandsDown, handleHandsUp } =
    useStackmat();
  const roomId = useRoomId();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code == "Space" && !e.repeat) handleHandsDown();
    },
    [handleHandsDown],
  );

  const onKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code == "Space" && !e.repeat) handleHandsUp();
    },
    [handleHandsUp],
  );

  const onMouseDown = useCallback(() => {
    handleHandsDown();
  }, [handleHandsDown]);

  const onMouseUp = useCallback(() => {
    handleHandsUp();
  }, [handleHandsUp]);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleHandsDown();
    },
    [handleHandsDown],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleHandsUp();
    },
    [handleHandsUp],
  );

  useEffect(() => {
    if (state == "STOPPED") {
      socket.emit("submit_solve", roomId, finalTime);
    }
  }, [state, finalTime, roomId]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onKeyDown, onKeyUp, onMouseDown, onMouseUp, onTouchStart, onTouchEnd]);

  return (
    <main className="h-screen p-8 flex flex-col">
      <Text className="text-xl text-center">{scramble}</Text>
      <div className="flex-1 flex flex-col justify-center">
        <Text
          className={`text-9xl text-center 
            ${state == "PRIMING" && "text-destructive"} 
            ${state == "READY" && "text-primary"}`}
        >
          {display}
        </Text>
      </div>
    </main>
  );
}

export default Timer;
