import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number | null): string {
  if (seconds === null) return "--";

  if (seconds < 60) {
    // Less than 1 minute: show as SS.XX
    return seconds.toFixed(2);
  } else {
    // 1 minute or more: show as M:SS.XX
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, "0")}`;
  }
}
