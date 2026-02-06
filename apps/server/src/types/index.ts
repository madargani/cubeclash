export interface Member {
  id: string;
  nickname: string;
}

export interface Room {
  id: string;
  hostId: string;
  members: Member[];
}
