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

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      // Skip the room matching socket.id (socket.io internal room)
      if (roomId === socket.id) continue;

      const room = getRoom(roomId);
      if (!room) continue;

      if (room.hostId == socket.id) {
        deleteRoom(roomId);
        socket.nsp.in(roomId).disconnectSockets(true);
        console.log(`Room ${roomId} deleted`);
      } else {
        // Get member's nickname before removing
        const member = room.members.find((m) => m.id === socket.id);
        const nickname = member?.nickname;

        if (nickname) {
          removeMember(roomId, socket.id);
          socket.to(roomId).emit("member_left", nickname);
          console.log(
            `User ${socket.id} left room ${roomId} (nickname: ${nickname})`,
          );
        }
      }
    }

    console.log(`User ${socket.id} disconnected`);
  });
}
