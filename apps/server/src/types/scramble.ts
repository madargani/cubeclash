import { randomScrambleForEvent } from "cubing/scramble";

export async function generateScramble(): Promise<string> {
  const scramble = await randomScrambleForEvent("333");
  return scramble.toString();
}
