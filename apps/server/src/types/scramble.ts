import { randomScrambleForEvent } from "cubing/scramble";

export async function generateScramble(event: string): Promise<string> {
  let code = { "3x3": "333", "4x4": "444" }[event];

  if (!code) return "";

  const scramble = await randomScrambleForEvent(code);
  return scramble.toString();
}
