import { useCallback, useEffect, useRef, useState } from "react";

interface useStackmatReturn {
  state: "INSPECTING" | "PRIMING" | "READY" | "SOLVING" | "STOPPED";
  display: string;
  finalTime: number;
  handleHandsDown: () => void;
  handleHandsUp: () => void;
}

function useStackmat(
  inspectionTime: number = 60,
  primingTime: number = 1,
): useStackmatReturn {
  const [state, setState] = useState<
    "INSPECTING" | "PRIMING" | "READY" | "SOLVING" | "STOPPED"
  >("INSPECTING");

  // Time displayed on timer
  // inspection time -> running time
  // Should be formatted
  const [display, setDisplay] = useState<string>("");

  // Time that inspection starts
  // Used for calculating inspection time left
  // Doesn't change
  const inspectionStart = useRef<number>(performance.now() / 1000);

  // Time that solve starts
  // Used for calculating running time and final time
  // Set once when solve starts
  const solveStart = useRef<number>(-1);

  // Final time
  const finalTime = useRef<number>(-1);

  // Used to cancel priming when hands aren't down long enough
  const timeoutIdRef = useRef<number>(-1);

  // Used to stop animation updates when stopped
  const requestIdRef = useRef<number>(-1);

  const handleHandsDown = useCallback(() => {
    switch (state) {
      case "INSPECTING":
        setState("PRIMING");
        timeoutIdRef.current = setTimeout(
          () => setState("READY"),
          primingTime * 1000,
        );
        break;
      case "SOLVING":
        const now = performance.now() / 1000;
        finalTime.current = now - solveStart.current;
        setState("STOPPED");
        break;
    }
  }, [inspectionTime, primingTime, state]);

  const handleHandsUp = useCallback(() => {
    switch (state) {
      case "PRIMING":
        setState("INSPECTING");
        clearTimeout(timeoutIdRef.current);
        break;
      case "READY":
        solveStart.current = performance.now() / 1000;
        setState("SOLVING");
        break;
    }
  }, [inspectionTime, primingTime, state]);

  useEffect(() => {
    cancelAnimationFrame(requestIdRef.current);

    function step() {
      const now = performance.now() / 1000;

      switch (state) {
        case "INSPECTING":
        case "PRIMING":
        case "READY":
          const inspectionTimeLeft =
            inspectionTime - (now - inspectionStart.current);

          if (inspectionTimeLeft <= 0) {
            setState("STOPPED");
            setDisplay("DNF");
            return; // Stop animation
          }

          const ceil = Math.ceil(inspectionTimeLeft);
          setDisplay(ceil.toString());
          break;

        case "SOLVING":
          const runningTime = now - solveStart.current;
          setDisplay(runningTime.toFixed(2));
          break;

        case "STOPPED":
          const seconds = finalTime.current;
          setDisplay(seconds.toFixed(2));
          return;
      }

      // Request again to loop
      requestIdRef.current = requestAnimationFrame(step);
    }

    requestIdRef.current = requestAnimationFrame(step);
  }, [state]);

  return {
    state,
    display,
    finalTime: finalTime.current,
    handleHandsDown,
    handleHandsUp,
  };
}

export default useStackmat;
