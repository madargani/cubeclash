import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { addMember, createRoom, getRoom, roomExists } from "./rooms.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User requests to create room
  socket.on("room:create", () => {
    const room = createRoom(socket.id);

    // Add host socket to room
    socket.join(room.id);

    // Inform host that room was created and give room id
    socket.emit("room:created", room.id);

    console.log(`User ${socket.id} created room ${room.id}`);
  });

  // User requests to join room
  socket.on("room:join", (roomId) => {
    const room = getRoom(roomId);

    // If room doesn't exist inform user
    if (!room) {
      socket.emit("room:error", "Room doesn't exist");
      return;
    }

    socket.join(roomId);
    addMember(roomId, socket.id);

    // Inform group that new user joined
    io.to(roomId).emit("user:joined", socket.id);

    socket.emit("room:joined", roomId, room.members);

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("disconnect", () => {
    // TODO: Delete room
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
