import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  addMember,
  createRoom,
  deleteRoom,
  getRoom,
  removeMember,
} from "./rooms.js";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@cubeclash/types";

const app = express();
const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_ORIGIN || "http://localhost:5173"],
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User requests to create room
  socket.on("create_room", (nickname, callback) => {
    const room = createRoom(socket.id, nickname);

    // Add host socket to room
    socket.join(room.id);

    // Acknowledge room creation
    callback(room.id);

    console.log(`User ${socket.id} created room ${room.id}`);
  });

  // User requests to join room
  socket.on("join_room", (nickname, roomId, callback) => {
    const room = getRoom(roomId);

    // Return null if room doesn't exist
    if (!room) {
      callback(null);
      return;
    }

    // add member
    socket.join(roomId);
    addMember(roomId, socket.id, nickname);

    // Acknowledge successful join
    const members = room.members.map((member) => member.nickname);
    callback(members);

    // Inform group that new user joined
    socket.to(roomId).emit("member_joined", nickname);

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Host starts game
  socket.on("start_game", (roomId) => {
    const room = getRoom(roomId);

    if (!room)
      // Room doesn't exist
      return;

    if (room.hostId != socket.id)
      // Not host of game
      return;

    io.to(roomId).emit("start_round", "R U R U R U");

    console.log(`Room ${roomId} started game`);
  });

  socket.on("disconnect", () => {
    for (const roomId in socket.rooms) {
      // check if host of room
      if (getRoom(roomId)?.hostId == socket.id) {
        deleteRoom(roomId);

        // disconnect all members of room
        io.in(roomId).disconnectSockets(true);

        console.log(`Room ${roomId} deleted`);
      } else {
        removeMember(roomId, socket.id);
      }
    }

    console.log(`User ${socket.id} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
