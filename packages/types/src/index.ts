// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  name: string;
  rounds: (number | null)[];
  average: number | null;
}

// Socket.io Types
export interface ServerToClientEvents {
  member_joined: (nickname: string) => void;
  member_left: (nickname: string) => void;
  start_round: (scramble: string, round: number) => void;
  round_done: (leaderboard: LeaderboardEntry[]) => void;
  game_over: (leaderboard: LeaderboardEntry[]) => void;
}

export interface ClientToServerEvents {
  create_room: (nickname: string, callback: (roomId: string) => void) => void;
  join_room: (
    nickname: string,
    roomId: string,
    callback: (members: string[] | null) => void,
  ) => void;
  start_game: (roomId: string) => void;
  next_round: (roomId: string) => void;
  submit_solve: (roomId: string, time: number) => void;
}

export interface InterServerEvents {}

export interface SocketData {}
