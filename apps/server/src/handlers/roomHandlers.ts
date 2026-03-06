import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  SocketCallbackResponse,
} from "@cubeclash/types";
import {
  addMember,
  createRoom,
  deleteRoom,
  getRoom,
  removeMember,
  updateSettings,
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
    callback({ status: "success", data: room.id });

    console.log(`User ${socket.id} created room ${room.id}`);
  });

  socket.on("join_room", (nickname, roomId, callback) => {
    const room = getRoom(roomId);

    if (!room) {
      callback({ status: "error", message: "Room not found" });
      return;
    }

    // nickname is already used
    if (room.members.some((member) => member.nickname === nickname)) {
      callback({ status: "error", message: "Username already taken" });
      return;
    }

    socket.join(roomId);
    addMember(roomId, socket.id, nickname);

    const members = room.members.map((member) => member.nickname);
    callback({ status: "success", data: members });

    socket.to(roomId).emit("member_joined", nickname);

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("update_settings", (roomId, settings) => {
    const room = getRoom(roomId);

    if (!room) return;

    // Only host can change settings
    if (room.hostId !== socket.id) return;

    const success = updateSettings(roomId, settings);
    if (!success) return;

    // Broadcast to all including sender
    socket.nsp.in(roomId).emit("settings_changed", settings);

    console.log(`Settings updated in room ${roomId} by ${socket.id}`);
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
