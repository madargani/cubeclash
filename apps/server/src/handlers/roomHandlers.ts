import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@cubeclash/types";
import {
  addMember,
  countConnected,
  createRoom,
  deleteRoom,
  getMember,
  getRoom,
  setMemberConnected,
  updateSettings,
} from "../rooms.js";
import { broadcastRoomState, deriveHostMemberId } from "../snapshot.js";

type CubeClashSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type CubeClashServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerRoomHandlers(
  socket: CubeClashSocket,
  io: CubeClashServer,
) {
  socket.on("create_room", (nickname, callback) => {
    const room = createRoom(nickname);
    const memberId = room.hostMemberId;

    socket.join(room.id);
    socket.data = { roomId: room.id, memberId };
    callback({ status: "success", data: { roomId: room.id, memberId } });

    broadcastRoomState(io, room);

    console.log(`Member ${memberId} created room ${room.id}`);
  });

  socket.on("join_room", (nickname, roomId, callback) => {
    // A socket binds to at most one room (design D4)
    if (socket.data.roomId !== undefined) {
      callback({ status: "error", message: "Already in a room" });
      return;
    }

    const room = getRoom(roomId);
    if (!room) {
      callback({ status: "error", message: "Room not found" });
      return;
    }

    // nickname is already used - checked against all members, connected or not
    if (room.members.some((member) => member.nickname === nickname)) {
      callback({ status: "error", message: "Username already taken" });
      return;
    }

    const member = addMember(roomId, nickname);
    if (!member) {
      callback({ status: "error", message: "Room not found" });
      return;
    }

    // Mid-round joins spectate the current round: initialize the results
    // row to round + 1 nulls so the joiner counts as done for it (design D5)
    if (room.round >= 0) {
      room.results.set(member.id, new Array(room.round + 1).fill(null));
    }

    socket.join(roomId);
    socket.data = { roomId, memberId: member.id };
    callback({ status: "success", data: { memberId: member.id } });

    broadcastRoomState(io, room);

    console.log(`Member ${member.id} joined room ${roomId}`);
  });

  socket.on("rejoin_room", (roomId, memberId, callback) => {
    const room = getRoom(roomId);
    if (!room) {
      callback({ status: "error", message: "Room not found" });
      return;
    }

    const member = getMember(roomId, memberId);
    if (!member) {
      callback({ status: "error", message: "Member not found" });
      return;
    }

    if (member.connected) {
      callback({ status: "error", message: "Already connected" });
      return;
    }

    socket.join(roomId);
    socket.data = { roomId, memberId };
    setMemberConnected(roomId, memberId, true);
    callback({ status: "success", data: null });

    broadcastRoomState(io, room);

    console.log(`Member ${memberId} rejoined room ${roomId}`);
  });

  socket.on("update_settings", (settings) => {
    const { roomId, memberId } = socket.data;
    if (roomId === undefined || memberId === undefined) return;

    const room = getRoom(roomId);
    if (!room) return;

    // Only the effective host can change settings
    if (deriveHostMemberId(room) !== memberId) return;

    const success = updateSettings(roomId, settings);
    if (!success) return;

    broadcastRoomState(io, room);

    console.log(`Settings updated in room ${roomId} by member ${memberId}`);
  });

  socket.on("disconnecting", () => {
    const { roomId, memberId } = socket.data;
    if (roomId !== undefined && memberId !== undefined) {
      const room = getRoom(roomId);

      if (room) {
        // Mark the member disconnected rather than removing them (design D6)
        setMemberConnected(roomId, memberId, false);

        if (countConnected(roomId) === 0) {
          deleteRoom(roomId);
          console.log(`Room ${roomId} deleted`);
        } else {
          broadcastRoomState(io, room);
        }

        console.log(
          `Member ${memberId} disconnected from room ${roomId}`,
        );
      }
    }

    console.log(`User ${socket.id} disconnected`);
  });
}
