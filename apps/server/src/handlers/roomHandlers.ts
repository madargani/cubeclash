import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@cubeclash/types";
import {
  addMember,
  createRoom,
  deleteRoom,
  getRoom,
  removeMember,
} from "../rooms.js";

type CubeClashSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerRoomHandlers(socket: CubeClashSocket) {
  socket.on("create_room", (nickname, callback) => {
    const room = createRoom(socket.id, nickname);

    socket.join(room.id);
    callback(room.id);

    console.log(`User ${socket.id} created room ${room.id}`);
  });

  socket.on("join_room", (nickname, roomId, callback) => {
    const room = getRoom(roomId);

    if (!room) {
      callback(null);
      return;
    }

    socket.join(roomId);
    addMember(roomId, socket.id, nickname);

    const members = room.members.map((member) => member.nickname);
    callback(members);

    socket.to(roomId).emit("member_joined", nickname);

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("disconnect", () => {
    for (const roomId in socket.rooms) {
      if (getRoom(roomId)?.hostId == socket.id) {
        deleteRoom(roomId);
        socket.nsp.in(roomId).disconnectSockets(true);
        console.log(`Room ${roomId} deleted`);
      } else {
        removeMember(roomId, socket.id);
      }
    }

    console.log(`User ${socket.id} disconnected`);
  });
}
